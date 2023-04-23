---
title: "Removing a disk from a RAIDZ"
date: 2021-08-29T11:38:44-04:00
draft: false
tags: [zfs, homelab, storage]
aliases: ['/2021/08/removing-disk-from-raidz']
type: "post"
description: "Need to migrate data from a RAIDZ zpool? Take a drive offline, nuke its identity, create new partition table, format, and more! Read on."
---

You can't remove a disk from a RAIDZ zpool.

**But** if you're removing a disk such that you can migrate the data *away* from
the zpool into that disk and then plan on **destroying the zpool** anyway, then
read on.

In my case. I wanted to switch this particular zpool over to be a simple mergerfs volume, and copy the data from the zpool into it. But I didn't have any additional (big enough) disks laying around, so incrementally removing disks from the zpool and adding them to a mergerfs while copying the data from one to the other was the approach I used.

<!--more-->

>#### Caveats:
>
>You have to maintain enough redundancy in your zpool so that its data can still
be read. In my case it is a 3-disk `raidz1`, so I can take 1 disk offline and
the files can still be read/written at the mountpoint.

### Step 1

First take the drive offline and mark the it as faulted using the `-f` flag.

```
$ sudo zpool offline -f mypool ata-VBOX_HARDDISK_VB7891bc5a-9b5421cf
```

Now check `zpool status`. It should look something like this

Should look something like this
 
```
$ zpool status
  pool: mypool
 state: DEGRADED
status: One or more devices are faulted in response to persistent errors.
	Sufficient replicas exist for the pool to continue functioning in a
	degraded state.
action: Replace the faulted device, or use 'zpool clear' to mark the device
	repaired.
  scan: resilvered 18K in 0 days 00:00:00 with 0 errors on Sun Aug 29 14:44:22 2021
config:

	NAME                                       STATE     READ WRITE CKSUM
	mypool                                     DEGRADED     0     0     0
	  raidz1-0                                 DEGRADED     0     0     0
	    ata-VBOX_HARDDISK_VB7a39b00c-f849e138  ONLINE       0     0     0
	    ata-VBOX_HARDDISK_VB00eb5b38-96563549  ONLINE       0     0     0
	    ata-VBOX_HARDDISK_VB7891bc5a-9b5421cf  FAULTED      0     0     0  external device fault

errors: No known data errors
```

### Step 2

Next, use `gdisk` "expert functionality" to nuke that disk's whole identity
using `x`, then `z` (to "zap") and say `Y` to wiping out the MBR.
 
```
$ sudo gdisk /dev/sdd
GPT fdisk (gdisk) version 0.8.8

Partition table scan:
  MBR: protective
  BSD: not present
  APM: not present
  GPT: present

Found valid GPT with protective MBR; using GPT.

Command (? for help): ?
b   back up GPT data to a file
<snip>
w   write table to disk and exit
x   extra functionality (experts only)
?   print this menu

Command (? for help): x

Expert command (? for help): ?
a   set attributes
<snip>
w   write table to disk and exit
z   zap (destroy) GPT data structures and exit
?   print this menu

Expert command (? for help): z
About to wipe out GPT on /dev/sdb. Proceed? (Y/N): Y
GPT data structures destroyed! You may now partition the disk using fdisk or
other utilities.
Blank out MBR? (Y/N): Y
```

### Step 3

Then create a new partition table using`fdisk` and the `g` (make new gpt
partition table), then `n` (create new partition) then say `Y` to remove the
`zfs_member` signature. Then `w` to commit the changes to the disk.

```
$ sudo fdisk /dev/sdd

Command (m for help): g

Created a new GPT disklabel (GUID: A6EB42DC-7E50-484D-B256-13CCED85AE67).
The old zfs_member signature will be removed by a write command.

Command (m for help): n
Partition number (1-128, default 1):
First sector (2048-20971486, default 2048):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (2048-20971486, default 20971486):

Created a new partition 1 of type 'Linux filesystem' and of size 10 GiB.
Partition #1 contains a zfs_member signature.

Do you want to remove the signature? [Y]es/[N]o: Y

The signature will be removed by a write command.

Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.
```

### Step 4

Now you can do whatever you want to the disk

```
sudo mkfs.ext4 /dev/sdd1
```

Yay! Check `zpool status` again, and it should still show the disk as `FAULTED`.

Now you can migrate the data, and destroy the zpool.
