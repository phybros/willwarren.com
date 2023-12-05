---
title: "Kubernetes at Home"
date: 2021-07-19
draft: false
tags: [k8s, homelab]
---

I recently converted my Docker Swarm-based homelab to one powered by Kubernetes.

My original goals with setting up Swarm were to fully leverage all the compute
and memory available on my two-node setup. Ultimately though, because of
shared storage and other complications with hardware devices, I ended up
manually scheduling containers onto specific nodes, which totally defeated the
purpose.

Plus Kubernetes is cooler 😎.

The process took about a week of a few hours at a time to get set up. I wanted
to write about it here because otherwise I'll forget everything.

<!--more-->

## Start with the end in mind

At the end of this adventure, I ended up with the following setup:

 * 2-node k3s cluster
 * Fast high availability replicated storage using Longhorn
 * NFS for large file storage
 * Optional OAuth for cluster ingresses (put web UIs behind Google Login)
 * Optional automatic TLS for ingresses using Letsencrypt (via `cert-manager`)

If any of that is of interest, read on...

## The Hardware

There are 2 nodes: `🐳 whale` and `🦆 duck` (don't ask). They are not
particularly special:

`🐳 whale`

 * Intel(R) Core(TM) i5-7500 CPU @ 3.40GHz
 * 16GB DDR4
 * 120GB SSD
 * 8TB ZFS array (more on that later)
 * 1Gbe Networking

`🦆 duck`

 * Intel(R) Core(TM) i5-7600 CPU @ 3.50GHz
 * 32GB DDR4
 * 120GB SSD
 * 1Gbe Networking

Both are running Ubuntu 20.04, and both have fixed IP addresses.

### OS Configuration

I used Ansible for this part. I tried to keep it simple, and the basics of the
configuration I used were to install `open-iscsi` (required for Longhorn) and 
`nfs-common` (required for NFS mounts) and then:

```yaml
- name: Enable IPv4 forwarding
  sysctl:
    name: net.ipv4.ip_forward
    value: "1"
    state: present
    reload: yes
- name: Enable IPv6 forwarding
  sysctl:
    name: net.ipv6.conf.all.forwarding
    value: "1"
    state: present
    reload: yes
# adapted from https://germaniumhq.com/2019/02/14/2019-02-14-Disabling-Swap-for-Kubernetes-in-an-Ansible-Playbook/
- name: Disable SWAP in fstab since kubernetes can't work with swap enabled (1/2)
  replace:
    path: /etc/fstab
    regexp: '^([^#].*?\sswap\s+sw\s+.*)$'
    replace: '# \1'
  register: swap_was_disabled
- name: Disable SWAP since kubernetes can't work with swap enabled (2/2)
  shell: |
    swapoff -a
  when: swap_was_disabled.changed
```

## The Software

I decided to use k3s in this setup, because it's simpler for this type of
environment (small, 2 node cluster) and it just works.

### Installing the k3s server (master)

Our master node is going to be `🐳 whale`, so we have to run the following on
that box:

```bash
sudo curl -sfL https://get.k3s.io | sh -
```

That's it!

This will set up and enable the `containerd` daemon and install the rest of the
k3s control plane. Since docker also uses `containerd`, my existing running
containers are not affected at all!

Once it's done, you can test it with:

```bash
$ sudo k3s kubectl get svc
NAME        TYPE       CLUSTER-IP  EXTERNAL-IP  PORT(S)  AGE
kubernetes  ClusterIP  10.43.0.1   <none>       443/TCP  5m30s
```

If that works, we can proceed to adding a worker node. To do that we need the
`node-token` for the master node. The `k3s` server helpfully places the token in
a file on the server: `/var/lib/rancher/k3s/server/node-token`.

Copy the contents of that file somewhere (I just `cat`ted it and then
copy-pasted it).

### Installing the k3s agent (worker)

Now, to make a real cluster, we need to get the worker node (`🦆 duck`)
involved.

To install the k3s agent, run this on the worker node (replace `<TOKEN>` with
the token from the previous step, and `<MASTER IP>` with the IP of the master
node):

```bash
sudo curl -sfL https://get.k3s.io \
  | K3S_TOKEN=<TOKEN> K3S_URL=https://<MASTER IP>:6443 sh -
```

Once that's finished, it's time to make sure we can run workloads on both nodes.

### Testing the setup

Here's a `Deployment` that will run pods on both nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
  labels:
    app: nginx-test
spec:
  replicas: 4
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      containers:
      - name: nginx-test
        image: nginx
```

Put that in a file called `nginx.yaml` on your server node, and run
`sudo k3s kubectl apply -f nginx.yaml`.

Then check the pods:

```bash
$ sudo k3s kubectl get pods -o wide

NAME                              READY   STATUS    RESTARTS   AGE     IP            NODE    NOMINATED NODE   READINESS GATES
nginx-test-7795b97f48-t48g5       1/1     Running   0          5s      10.42.1.106   duck    <none>           <none>
nginx-test-7795b97f48-rjkwb       1/1     Running   0          6s      10.42.1.107   whale   <none>           <none>
nginx-test-7795b97f48-ln5kp       1/1     Running   0          6s      10.42.1.108   whale   <none>           <none>
nginx-test-7795b97f48-6x56q       1/1     Running   0          6s      10.42.1.109   duck    <none>           <none>
```

**Note:** If you're lucky you'll end up with pods spread over your nodes, but
they might all land on one. You can keep messing with the `replicas: 4` value
and re-`apply`-ing the manifest, or look into
[Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/).

Don't forget to clean up: `sudo k3s kubectl delete -f nginx.yaml` or
`sudo k3s kubectl delete deployment nginx-test`.

### Using kubectl from elsewhere

You don't want to log into your servers to manage the cluster, so on the master
node, copy `/etc/rancher/k3s/k3s.yaml` onto your local machine as 
`~/.kube/config`. Then replace `127.0.0.1` with the IP or name of your k3s
server.

Obviously you need to install `kubectl` for this to work.

Also **PRO TIP**: put this at the bottom of your `~/.bashrc` or `~/.zshrc` or
similar:

```sh
alias k=kubectl
```

Then getting pods can be a little characters as `k get po`. Additionally most
resources types have a short form; `deploy` for `deployments` or `no` for
`nodes`. If it saves a few keyboard strokes, it's worth doing.

## Traefik conflicts

I mentioned I was running Docker Swarm on these nodes before. Luckily, since
Docker uses `containerd` (and `containerd-shim`) under the hood, it can coexist
on the same machine as k3s. Which is good for my cutover period, while I slowly
migrate each service from docker-compose YAMLs to Kubernetes YAMLs.

The downside however is that my Swarm-hosted Traefik 2.x setup was conflicting
with the Traefik 1.7 setup that comes bundled with k3s.

I rashly decided to disable Traefik in k3s the *wrong* way (I just did
`kubectl delete -n kube-system deploy traefik`).

This works, Traefik stops doing things in the kube cluster, but then putting it
back is a huge pain. You can convince k3s to re-run the `helm` chart that runs
on startup by using this eldritch nightmare (requires `jq`):

```bash
# Save the job config as an edited JSON file
kubectl get -n kube-system job "helm-install-traefik" -o json \
    | jq 'del(.spec.selector)' \
    | jq 'del(.spec.template.metadata.labels)' \
    > helm-install-traefik.json

# Force the job back into k8s again :'(
cat helm-install-traefik.json | kubectl replace --force -f -
```

Gross. But it works 🤷‍♂️

Again, this wouldn't be an issue if you were starting from scratch, just if you
already have something listening on 80/443 that you don't want to shut down
right away.
