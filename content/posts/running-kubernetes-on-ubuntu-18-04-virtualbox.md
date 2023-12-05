---
date: "2019-05-13"
ogimage: images/2019/05/k8s-logo.png
tags:
- containers
- sysadmin
title: Running Kubernetes on Ubuntu 18.04
toc: true
---

Kubernetes has ostensibly become the defacto leader in the container
orchestration world. If you want to run a bunch of containers across multiple
nodes in a cluster, k8s is the way to go.

I really wanted to convert some of the web-based services I currently run on
Docker on my home network into Kubernetes Deployments. Why? Why not?

I aimed to create a basic setup of 1 master and 2 worker nodes so I needed 3
machines. I used virtual machines to do this, but it would work just as well
with any 3 machines. The main requirement is that they can all talk to one
another.

This is pretty much the steps I used to get up and running, but there are
probably some details or nuance missing. Leave a comment if you think I could 
improve the info!


From here on out, I will assume you have 3 servers running Ubuntu 18.04 with
all the latest updates. My servers are called `k8s-master`, `k8s-node1` and
`k8s-node2`.


## Network Setup

My home network assigns IPs via DHCP in the range
**192.168.7.2 - 192.168.7.119** which leaves 30 IPs in the range 
**192.168.7.220 - 192.168.7.250** that can be used as static IPs. You don't
_have_ to use static IPs for any of this but it makes things way simpler.

### Assign Static IPs

The way you do this in Ubuntu 18.04 has changed from older versions. You now use
`netplan` to generate all the configs for the actual things that do the network
configuration under the hood ¯\\\_(ツ)\_/¯.

Here's an example of setting a static IP for my `k8s-master` machine. I just
edited `/etc/netplan/50-cloud-init.yaml` that was there by default:

```yaml
network:
    version: 2
    renderer: networkd
    ethernets:
        enp0s3:
            dhcp4: no
            addresses: [192.168.7.220/24]
            gateway4: 192.168.7.1
            nameservers:
                addresses: [8.8.8.8,8.8.4.4]
```

Then run `sudo netplan apply` (note that if you were connected over SSH, you
might need to reconnect now, using the new IP).

## Preparing the Servers

### Installing Dependencies

All nodes will need `docker-ce`, `kubeadm`, `kubelet` and `kubectl`. You can
install these by adding the package repos and then installing via `apt`.

```bash

# This is all easier if you just become root for a minute
sudo -i

apt update
apt install -y apt-transport-https

# Add the signing keys for kubernetes and docker-ce
curl -s https://download.docker.com/linux/ubuntu/gpg | apt-key add -
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

# Add the repos
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu bionic stable"
add-apt-repository "deb [arch=amd64] http://apt.kubernetes.io/ kubernetes-xenial main"

# Install all the things
apt-get update
apt-get install -y docker-ce kubeadm kubelet kubectl

####################################
# Ctrl-D to drop root privileges!!!!
####################################
```

I usually like to `sudo reboot` after all of this. I don't think it's really
needed, but call me superstitious.

### Turning off swap

Kubernetes refuses to start if the host node has `swap` enabled.

```bash
# Disable swap systemwide
sudo swapoff -a

# Edit /etc/fstab and remove any swap entries you find to make it stick
sudo nano /etc/fstab

# Verify by looking in /prod
cat /proc/swaps
```

## Initializing the Master

We use `kubeadm` to initialize a new k8s cluster. Pass the IP of your
`k8s-master` node in as the `apiserver-advertise-address` and `10.244.0.0/16`
as the pod network CIDR (**IMPORTANT** if you're using `flannel`).

```bash
# On k8s-master
sudo kubeadm --apiserver-advertise-address=192.168.7.220 \
  --pod-network-cidr=10.244.0.0/16
```

Note: the specific Pod CIDR **10.244.0.0/16** is required to make flannel work
(see below).

## Deploying a Network

I decided to use Flannel since it is best supported by MetalLB (see below).

```bash
kubectl apply -f \
https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
```

Now double check that everything is running. You should see some `coredns` pods
with status `Running` if you run `kubectl get pods -A`.

## Load Balancing with MetalLB

Running kubernetes on bare metal is great, until you get to the Load Balancing
phase. The "easiest" way to get to your services is to deploy them using the
`NodePort` type.

Unfortunately that means that if your pod gets moved to another node, any
external references to the node IP will now be wrong.

[MetalLB](https://metallb.universe.tf/tutorial/layer2/) is an open source
project which makes clever use of ARP to essentially assign IPs on your network
to kubernetes service endpoints. An example can be found towards the end of this
post.

Deploy the metallb system using:

```bash
kubectl apply -f \
https://raw.githubusercontent.com/google/metallb/v0.7.3/manifests/metallb.yaml
```

Then you can use `kubectl get pods -n metallb-system` to make sure those pods
are up and running correctly:

```
NAME                         READY   STATUS    RESTARTS   AGE
controller-cd8657667-s9s97   1/1     Running   0          3d11h
speaker-jw8qr                1/1     Running   1          3d12h
speaker-lsln7                1/1     Running   1          3d12h
```

Then it's time to tell metallb what it should do. We want it to assign IPs in
the range `192.168.7.220-192.168.7.250` and so:

```yaml
# metallb-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: my-ip-space
      protocol: layer2
      addresses:
      - 192.168.7.220-192.168.7.250
```

Now apply this to your cluster using `kubectl apply -f metallb-config.yaml`.

## Joining Nodes to the Cluster

So now you have a `k8s-master` server running, with a network overlay, and a
provider for `LoadBalancer` service endpoint types.

This command can be found in the output of `kubeadm init` from your master:

```bash
# run this from k8s-node1 and k8s-node2
kubeadm join 192.168.7.220:6443 --token <your token> \
    --discovery-token-ca-cert-hash sha256:<some hash>
```

You can check out the Node status by using `kubectl get nodes`.

## Deploying an Example App

Now we're at the point where we can start deploying stuff into our new cluster!

Below is the yaml config 4 replicas of an image called
`nginxdemos/hello:plain-text`. This outputs some info about the server the
nginx process is running on (in this case, the name of the pod!).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 4
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginxdemos/hello:plain-text
        ports:
        - containerPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx
  type: LoadBalancer
```

Note the use of the `type: LoadBalancer` in the `spec` section of the app
config.

Now let's make sure the pods are up and running:

```bash
$ kubectl get svc,pods

NAME                 TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
service/kubernetes   ClusterIP      10.96.0.1       <none>           443/TCP        3d12h
service/nginx        LoadBalancer   10.99.119.202   192.168.7.230    80:32178/TCP   3d11h

NAME                                   READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-c9fdccf48-hp2nr   1/1     Running   0          3d10h
pod/nginx-deployment-c9fdccf48-rbnlp   1/1     Running   0          3d10h
pod/nginx-deployment-c9fdccf48-rwmjw   1/1     Running   0          3d10h
pod/nginx-deployment-c9fdccf48-srl8f   1/1     Running   0          3d10h
```

Now confirm that your service is getting load balanced properly!

```bash
$ curl 192.168.7.230

Server address: 10.244.1.20:80
Server name: nginx-deployment-c9fdccf48-hp2nr
Date: 11/May/2019:14:34:14 +0000
URI: /
Request ID: 370c7a421e3de42122400d11f43155de
```

It gave us `Server name: nginx-deployment-c9fdccf48-hp2nr`. Now hit it again:

```bash
$ curl 192.168.7.230

Server address: 10.244.2.19:80
Server name: nginx-deployment-c9fdccf48-rbnlp
Date: 11/May/2019:14:34:15 +0000
URI: /
Request ID: 10ef77ca7166af171ad1f6979e594dc0
```

BOOM: `Server name: nginx-deployment-c9fdccf48-rbnlp`.

## Conclusion

Now we can deploy anything into our cluster, and it will get its own IP on your
network!

As an exercise for the reader, try forcefully powering down one of your nodes.

Did any of your pod replicas automatically migrate to the other worker node? If
they didn't, try figure out why not and then try make it so that happens!

_c o n t a i n e r s_
