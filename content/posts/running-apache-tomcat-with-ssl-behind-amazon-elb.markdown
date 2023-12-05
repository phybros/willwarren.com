+++
Description = ""
date = 2014-01-27
title = "Apache Tomcat with SSL behind Amazon ELB"
slug = "running-apache-tomcat-with-ssl-behind-amazon-elb"
tags = ["aws", "sysadmin"]

+++

If you're running a high-availability system of some kind, chances are you are into some sort of Load Balancing. If you happen to be writing a Java app, and happen to be using Apache Tomcat as your servlet container, then this tip is for you.

<!--more-->

I had a system which needed to be HTTPS-only but also have the SSL terminated at the load balancer. Naturally, I forwarded the HTTP and HTTPS ports on my Elastic Load Balancer and had my application configured to redirect any insecure connections to an SSL connection. I started having a couple of strange issues where occasionally it would leave the connection on HTTP when it should have been redirecting.

My setup was basically:

```text
  HTTP (80) -----> ELB -----> Tomcat (8080)
HTTPS (443) -----> ELB -----> Tomcat (8080)
```

Turned out, I needed to set a couple of extra options in my Tomcat HTTP Connector section (find it in `server.xml`). This was the combination of options that did it for me:

```xml
<Connector
    port="8080"
    protocol="HTTP/1.1"
    proxyPort="443"
    scheme="https"
    secure="true"
    proxyName="myapp.example.com"
    connectionTimeout="20000"
    URIEncoding="UTF-8"
    redirectPort="8443" />
```

This assumes your app is hosted at `myapp.example.com`

In my case, the one that really did the trick was `secure="true"` which according to the [documentation](http://tomcat.apache.org/tomcat-7.0-doc/config/http.html):

>Set this attribute to true if you wish to have calls to `request.isSecure()` to return `true` for requests received by this `Connector`.

Hopefully this will save someone some headaches.
