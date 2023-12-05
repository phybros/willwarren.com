+++
date = 2017-10-15
ogimage = "images/2017/10/redis-logo-lg.jpg"
ogimagealt = "Redis Logo"
title = "Redis Cluster Cheatsheet"
tags = ["sysadmin", "linux", "redis"]
toc = true

+++

Redis is very, very good at running as a Highly Available service. It has supported clustering since 3.0.0 was released back in April of 2015. Clustering many redis servers together allows for higher throughput (spreading the load), as well as redundancy (for when servers die unexpectedly).

Here I have assembled some notes about common things you might want to do to your Redis cluster, and how to do them.
<!--more-->

## Prerequisites

1. Install the `redis` gem, using `gem install redis`
1. Go and get `redis-trib.rb` from here: <https://github.com/antirez/redis/blob/3.2.11/src/redis-trib.rb>


**UPDATE:** By popular demand, here is a Github repo you can use to follow along: <https://github.com/phybros/redis-cluster-playground>


## Creating a new cluster

To create a new cluster from scratch, spin up at least 3 Redis machines (yes, you can do it with 2, but *redundancy*). Once your machines are up and listening (in my example I use `127.0.0.1:7001`, `127.0.0.1:7002` and `127.0.0.1:7003`), do the following:

```bash
$ ./redis-trib.rb create \
127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003
```

```text
>>> Creating cluster
>>> Performing hash slots allocation on 3 nodes...
Using 3 masters:
127.0.0.1:7001
127.0.0.1:7002
127.0.0.1:7003
M: 29e29d2f8d6ecf4c699aa6a2e4f1c7e2a0d52d65 127.0.0.1:7001
   slots:0-5460 (5461 slots) master
M: 12bf47b9ad61863e1f29034f3f1c73d74612ed82 127.0.0.1:7002
   slots:5461-10922 (5462 slots) master
M: 5bc9133ac072f2e8f2d6106b618950f79585fb46 127.0.0.1:7003
   slots:10923-16383 (5461 slots) master
Can I set the above configuration? (type 'yes' to accept): yes
>>> Nodes configuration updated
>>> Assign a different config epoch to each node
>>> Sending CLUSTER MEET messages to join the cluster
Waiting for the cluster to join..
>>> Performing Cluster Check (using node 127.0.0.1:7001)
M: 29e29d2f8d6ecf4c699aa6a2e4f1c7e2a0d52d65 127.0.0.1:7001
   slots:0-5460 (5461 slots) master
   0 additional replica(s)
M: 5bc9133ac072f2e8f2d6106b618950f79585fb46 127.0.0.1:7003@17003
   slots:10923-16383 (5461 slots) master
   0 additional replica(s)
M: 12bf47b9ad61863e1f29034f3f1c73d74612ed82 127.0.0.1:7002@17002
   slots:5461-10922 (5462 slots) master
   0 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

`redis-trib.rb` proposed a simple 3 master configuration, and we typed `yes` at the prompt to accept the configuration and set up the cluster.

## Adding slaves to the cluster

Once you have your 3 masters up and running, and serving your keys nicely, it is probably a good idea to add some fault-tolerance. You can do this by adding slaves a.k.a. replicas to the cluster.

In my example, I have created 3 additional nodes on ports 8001, 8002 and 8003.

```bash
$ ./redis-trib.rb add-node \
--slave \
127.0.0.1:8001 127.0.0.1:7001
```

And the result:

```text
>>> Adding node 127.0.0.1:8001 to cluster 127.0.0.1:7001
>>> Performing Cluster Check (using node 127.0.0.1:7001)
M: 29e29d2f8d6ecf4c699aa6a2e4f1c7e2a0d52d65 127.0.0.1:7001
   slots:0-5460 (5461 slots) master
   0 additional replica(s)
M: 5bc9133ac072f2e8f2d6106b618950f79585fb46 127.0.0.1:7003@17003
   slots:10923-16383 (5461 slots) master
   0 additional replica(s)
M: 12bf47b9ad61863e1f29034f3f1c73d74612ed82 127.0.0.1:7002@17002
   slots:5461-10922 (5462 slots) master
   0 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
Automatically selected master 127.0.0.1:7001
>>> Send CLUSTER MEET to node 127.0.0.1:8001 to make it join the cluster.
Waiting for the cluster to join...
>>> Configure node as replica of 127.0.0.1:7001.
[OK] New node added correctly.
```

Note: the order of the arguments for `add-node` is the IP:Port of the instance that shall become a slave, and then the IP:Port of any existing node in your cluster. `redis-trib.rb` will choose any random master with the least slaves to add the slave to.

If you want to tell `redis-trib.rb` to add the slave to a specific master, pass the master's node ID in as an argument to the `--master-id` parameter like so:

```bash
$ ./redis-trib.rb add-node \
--slave \
--master-id 5bc9133ac072f2e8f2d6106b618950f79585fb46 \
127.0.0.1:8001 127.0.0.1:7001
```

Repeat this 2 more times to add slaves to your other 2 nodes.

### Creating a new cluster with slaves

Of course, you can just create your cluster with the slaves already set up. In order to do that, spin up 6 redis servers instead of 3, and create your cluster in this way (assuming we're starting over with the cluster):

```bash
$ ./redis-trib.rb create \
--replicas 1 \
127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
127.0.0.1:8001 127.0.0.1:8002 127.0.0.1:8003
```

Super easy to create a cluster with masters and replicas all at once by adding the `--replicas` parameter, as well as supplying the full list of cluster nodes to the `redis-trib.rb create` command.

## Adding new masters to an existing cluster

We started with 3 masters which is a really good number for many reasons. If your workload requires that you store a lot more keys, or you have many many clients all hitting your cluster at once, you might decide to horizontally scale your cluster. This means adding more masters.

### Adding the masters

I created a 4th master, listening on port 9001. Here we add it to the cluster as an **empty node**:

```bash
$ ./redis-trib.rb add-node \
127.0.0.1:9001 127.0.0.1:7001
```

And here we see it joining the cluster successfully.

```text
>>> Adding node 127.0.0.1:9001 to cluster 127.0.0.1:7001
>>> Performing Cluster Check (using node 127.0.0.1:7001)
M: 1c3c49b70db3225749a103c50eaa686cc50ef6a3 127.0.0.1:7001
   slots:0-5460 (5461 slots) master
   1 additional replica(s)
M: ca42fa21edc2b68ed91bfb491789b964d67c4858 127.0.0.1:7003@17003
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
S: fb18dcdc963d91e950e6c056cb2282f8f724afef 127.0.0.1:8002@18002
   slots: (0 slots) slave
   replicates 36eb90d48ed5fb5b754fa87c827ebbdf9ac1224b
M: 36eb90d48ed5fb5b754fa87c827ebbdf9ac1224b 127.0.0.1:7002@17002
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
S: aaa9999d9a27116ff871e8862a8b9029552aa29e 127.0.0.1:8001@18001
   slots: (0 slots) slave
   replicates 1c3c49b70db3225749a103c50eaa686cc50ef6a3
S: f9482851b908472a453cd33ecfefa55bcd2fc3c4 127.0.0.1:8003@18003
   slots: (0 slots) slave
   replicates ca42fa21edc2b68ed91bfb491789b964d67c4858
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Send CLUSTER MEET to node 127.0.0.1:9001 to make it join the cluster.
[OK] New node added correctly.
```

### Reallocating Hash Slots

The newly added master is just an **empty node**, with no work to do except gossip about the rest of the cluster. To give it some hash slots we can use a recently added `redis-trib` command: `rebalance`. This command is basically magic, but in a nutshell it takes a portion of the hash slots from each master and moves it to the new master. Behold:

```bash
$ ./redis-trib.rb rebalance --use-empty-masters 127.0.0.1:7001
```

As if by magic...

```text
>>> Performing Cluster Check (using node 127.0.0.1:7001)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Rebalancing across 4 nodes. Total weight = 4
Moving 1366 slots from 127.0.0.1:7001 to 127.0.0.1:9001@19001
...
Moving 1365 slots from 127.0.0.1:7002@17002 to 127.0.0.1:9001@19001
...
Moving 1365 slots from 127.0.0.1:7003@17003 to 127.0.0.1:9001@19001
...
```

Now you can easily verify:

```text
./redis-trib.rb info 127.0.0.1:7001
127.0.0.1:7001 (1c3c49b7...) -> 0 keys | 4096 slots | 1 slaves.
127.0.0.1:9001@19001 (0fdc74e9...) -> 0 keys | 4096 slots | 0 slaves.
127.0.0.1:7003@17003 (ca42fa21...) -> 0 keys | 4096 slots | 1 slaves.
127.0.0.1:7002@17002 (36eb90d4...) -> 0 keys | 4096 slots | 1 slaves.
```

## Removing a master

Masters cannot be removed until they are **empty nodes**. In order to empty out a master, you can use the `rebalance` command again, but telling it to give the node a `weight` of 0. Check it out:

```text
./redis-trib.rb info 127.0.0.1:7001
127.0.0.1:7001 (1c3c49b7...) -> 0 keys | 4096 slots | 1 slaves.
127.0.0.1:9001@19001 (0fdc74e9...) -> 0 keys | 4096 slots | 0 slaves.
127.0.0.1:7003@17003 (ca42fa21...) -> 0 keys | 4096 slots | 1 slaves.
127.0.0.1:7002@17002 (36eb90d4...) -> 0 keys | 4096 slots | 1 slaves.
[OK] 0 keys in 4 masters.
0.00 keys per slot on average.
```

We will remove the host listening on port 9001, whose short ID is `0fdc74e9`:

```text
./redis-trib.rb rebalance --weight 0fdc74e9=0 127.0.0.1:7001
```

Here we see the slots being taken from the 9001 node and redistributed among the other 3 masters:

```text
>>> Performing Cluster Check (using node 127.0.0.1:7001)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Rebalancing across 4 nodes. Total weight = 3.0
Moving 1366 slots from 127.0.0.1:9001@19001 to 127.0.0.1:7001
...
Moving 1365 slots from 127.0.0.1:9001@19001 to 127.0.0.1:7003@17003
...
Moving 1365 slots from 127.0.0.1:9001@19001 to 127.0.0.1:7002@17002
...
```

Now we are free to remove the node from the cluster completely using `del-node`:

```text
./redis-trib.rb del-node 127.0.0.1:7001 0fdc74e9d090047e8217e891fea4d858e9dd1def
>>> Removing node 0fdc74e9d090047e8217e891fea4d858e9dd1def from cluster 127.0.0.1:7001
>>> Sending CLUSTER FORGET messages to the cluster...
>>> SHUTDOWN the node.
```

Note, this command needs the whole master node ID which can be grabbed from `./redis-trib.rb check 127.0.0.1:7001`.

Now we can deprovision that server or send it to the scrapheap or do whatever you want to it.
