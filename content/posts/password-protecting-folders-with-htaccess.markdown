---
date: "2011-12-16"
slug: password-protecting-folders-with-htaccess
tags:
- sysadmin
title: Password protecting folders with .htaccess
---

I always forget how to do this, so I'm posting it on here for posterity. Sometimes it's useful to password protect a folder or files on your web server. If the web server is Apache, then you can use a couple of files - `.htaccess` and `.htpasswd` - to achieve this.<!--more-->

### Step 1 - Create .htpasswd file

Somewhere above the root directory of your web server (so that there's no way it can get served by your web server) run the following command

```bash
htpasswd -c .htpasswd username
```

This will create a file called `.htpasswd` with the username and hashed password for the user "username".

If you don't have command-line access to your web server, there are a few websites out there that will generate the file for you, which you can then upload to your server.

### Step 2 - Reconfigure your .htaccess file

In the directory you want to password protect, create a file called `.htaccess` and put this in it (obviously fill in your details):

```apacheconf
AuthType Basic
AuthName "My Password Protected Folder"
AuthUserFile /full/path/to/.htpasswd
Require valid-user
```

There you have it!

The authentication lasts for your whole browser session, so it will only prompt you for your password again if you close, then re-open your browser.
