+++
Description = ""
date = "2013-08-05 16:02:06+00:00"
title = "Redacting accidental password entries from your BASH history"
slug = "redacting-accidental-password-entries-from-your-bash-history"
tags = ["bash", "sysadmin", "security"]

+++
From time to time, I have been known to accidentally type my password into a "username" prompt in a `bash` shell. In that situation, the password you entered is now a part of your `~/.bash_history` file forever, unless you truncate or redact it.<!--more-->

A quick command to do this is

```bash
history -c
```

Don't forget to end your session ASAP as your password will still be stored in memory until you do.

For the truly paranoid (like me), I also recommend changing your password right away, in the eventuality that someone was snooping your session at the exact time that you happened to enter your password in plain text.

Now, where's my tinfoil hat?
