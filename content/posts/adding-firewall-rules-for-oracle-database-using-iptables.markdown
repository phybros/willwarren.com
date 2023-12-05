---
Description: ""
date: "2014-03-18"
slug: adding-firewall-rules-for-oracle-database-using-iptables
tags:
- sysadmin
- database
- oracle
title: Adding firewall rules for Oracle Database using iptables
---

To connect to a box on your network that is running Oracle Database, you will first need to allow connections to Oracle through your firewall.

<!--more-->

If you're running CentOS, RHEL, Fedora or any other Linux variant that uses `iptables`, use the following commands to create a firewall exception (Assuming you're running your listener on port 1521 - check with `sudo lsnrctl status`):

```bash
sudo iptables -I INPUT -p tcp --dport 1521 -j ACCEPT
```

Or to limit the connections to a specific IP address - e.g. `192.168.1.20` or an IP block - e.g. `192.168.1.0/24` use the `-s` option:

```bash
sudo iptables -I INPUT -s 192.168.1.0/24 -p tcp --dport 1521 -j ACCEPT
```

Don't forget to save your changes to make them permanent (still applied after reboot):

```bash
sudo service iptables save
```

Or

```bash
sudo /etc/init.d/iptables save
```

### Bonus round

Check the full status of all your firewall rules with the following command:

```bash
sudo iptables -L -n -v --line-numbers
```

### Further Reading

* Detailed information about `iptables` from the CentOS docs: [http://www.centos.org/docs/5/html/Deployment_Guide-en-US/ch-iptables.html](http://www.centos.org/docs/5/html/Deployment_Guide-en-US/ch-iptables.html)
