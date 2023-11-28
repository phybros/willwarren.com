---
title: "Upgrading a k3s cluster to Traefik 2"
date: 2021-08-01T11:00:00-04:00
draft: false
tags: [k8s, homelab, traefik]
aliases: ['/2021/08/upgrading-to-traefik-2']
---

Up until 1.20, k3s shipped with Traefik 1.7.x built in. Since 1.21, Traefik
2.4.x has been the bundled version. If you upgraded your k3s deployment from
<=1.20 to >=1.21 k3s will do nothing if it detects Traefik 1 installed. So it's
up to the adminstrator to upgrade it. Here's how I did it in my cluster with
some basic examples.

<!--more-->

**Note**: Before starting on this you should know that all services that use
`Ingress` are likely to be disrupted pretty heavily.

## Upgrade procedure

**Scenario/Assumptions**: You have a `1.21` cluster that started life as a
`1.20` cluster. Traefik1 is still installed and you want to now upgrade it to 2.

Starting with a basic example deployment like this that uses `Ingress`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
  labels:
    app: nginx-test
spec:
  replicas: 12
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
        image: nginxdemos/hello:plain-text

---
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: nginx-test
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  annotations:
    kubernetes.io/ingress.class: traefik
spec:
  rules:
    - host: mylab.fakedomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-svc
                port:
                  number: 80
```

When deployed it looks like this

```
$ kubectl get all
NAME                              READY   STATUS    RESTARTS   AGE
pod/nginx-test-78d94699bc-rr6js   1/1     Running   0          10m
pod/nginx-test-78d94699bc-67v6s   1/1     Running   0          11m
pod/nginx-test-78d94699bc-6qklb   1/1     Running   0          10m
pod/nginx-test-78d94699bc-gp6vs   1/1     Running   0          10m
pod/nginx-test-78d94699bc-6xxnt   1/1     Running   0          10m
pod/nginx-test-78d94699bc-xjz6h   1/1     Running   0          10m
pod/nginx-test-78d94699bc-6ww6z   1/1     Running   0          10m
pod/nginx-test-78d94699bc-sfhhh   1/1     Running   0          10m
pod/nginx-test-78d94699bc-bwkmw   1/1     Running   0          10m
pod/nginx-test-78d94699bc-msh9w   1/1     Running   0          10m
pod/nginx-test-78d94699bc-zlbvs   1/1     Running   0          10m
pod/nginx-test-78d94699bc-qsv8f   1/1     Running   0          10m

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP   10h
service/nginx-svc    ClusterIP   10.43.116.230   <none>        80/TCP    13m

NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-test   12/12   12           12          17m

NAME                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-test-7795b97f48   0         0         0       17m
replicaset.apps/nginx-test-78d94699bc   12        12        12      11m
```

And you can hit "mylab.fakedomain.com" with  `curl` or your browser and see
this:

```
Server address: 10.42.1.13:80
Server name: nginx-test-78d94699bc-6qklb
Date: 20/Aug/2021:13:46:40 +0000
URI: /
Request ID: f9c722a4f8d455cae19233152a8c2650
```

Everything is currently working, and you are now ready to start upgrading.

First reinstall the master/controlplane with traefik disabled. Running pods
won't be affected by this, but all your `Ingress`es will stop working.

```
sudo curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.21.4+k3s1 sh -s - --disable=traefik
```

Now reinstall the master/controlplane with traefik enabled

```
sudo curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.21.4+k3s1 sh -s -
```

Wait a few mins and then

```
sudo k3s kubectl get po -n kube-system

NAME                                      READY   STATUS      RESTARTS   AGE
metrics-server-86cbb8457f-cwptt           1/1     Running     0          11h
local-path-provisioner-5ff76fc89d-9pxqp   1/1     Running     4          11h
coredns-7448499f4d-ns4zt                  1/1     Running     0          18m
helm-install-traefik-crd-wtvlt            0/1     Completed   0          92s
helm-install-traefik-k7llg                0/1     Completed   1          92s
svclb-traefik-zfrbw                       2/2     Running     0          87s
svclb-traefik-kvg6f                       2/2     Running     0          87s
traefik-97b44b794-2ckzf                   1/1     Running     0          87s
```

Inspect the traefik pod

```
sudo k3s kubectl describe po traefik-97b44b794-2ckzf -n kube-system
```

You should see`2.4.x` in there somewhere!

```
...
Image: rancher/library-traefik:2.4.8
...
```

At this point traefik is upgraded and you must now go through and upgrade all
your `Ingress` yaml definitions to `IngressRoute` and redeploy them.

Another good thing to note here is that Traefik supports the old Ingress style
definitions as well. So you could just call the upgrade done here. I personally
wanted to move to `IngressRoute` to take advantage of some fancy middlewares.
If you do too, read on!

## Deleting/Replacing Ingress with IngressRoute

Traefik made their own CRD to replace `Ingress`: `IngressRoute`. Converting an
`Ingress` to an `IngressRoute` isn't too tricky. Use this page as a reference:
<https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/#kind-ingressroute>
there is also a CLI tool for migrating 
(https://github.com/traefik/traefik-migration-tool)
that is a bit out of date (doesn't work with `apiVersion: networking.k8s.io/v1`
Ingresses. You have to manually change them all to be 
`apiVersion: networking.k8s.io/v1beta` first which is dumb). I just changed
them all by hand.

Delete the old  `nginx-ingress` Ingress:

```
sudo k3s kubectl delete ingress nginx-ingress
ingress.networking.k8s.io "nginx-ingress" deleted
```

Now write a converted `IngressRoute` to look something like this

```
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: nginx-ingressroute
spec:
  entryPoints:
    - web
  routes:
  - kind: Rule
    match: "Host(`mylab.fakedomain.com`) && Path(`/`)"
    services:
    - kind: Service
      name: nginx-svc
      passHostHeader: true
      port: 80
      scheme: http
```

Then deploy it with `kubectl apply`. Repeat this for all your `Ingress` objects!

The nice thing about this process is that because Traefik 2 supports the
regular `Ingress` type still, you can slowly swap these out one by one with
minimal service disruption.

Note that there are also  `IngressRouteTCP` and  `IngressRouteUDP` kinds that
you can use for other stuff like SSH for gitea.

