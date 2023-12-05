+++
Description = ""
date = 2014-04-21
title = "Setting up SPF records for Google Apps and Amazon SES"
slug = "setting-spf-records-google-apps-amazon-ses"
tags = ["sysadmin", "aws"]

+++

**Update:** AWS now sends email using a `Mail-From` domain that they own and control (see [here](http://docs.aws.amazon.com/ses/latest/DeveloperGuide/spf.html)). This means you don't really need to configure your own SPF records at all. I'm leaving this post here for posterity and all the links that already point at it.

----

The [Sender Policy Framework (SPF)](http://www.openspf.org/) is an attempt to mitigate certain types of spam - specifically spam where the sender masquerades as a different sender. Technically, you can put whatever you want in the `From:` header of an email message, so you can pretend to be sending emails from `facebook.com` simply by putting something like `From: no-reply@facebook.com` in your email's headers.
<!--more-->
Email relay servers prevent this by looking up the sender's domain's SPF record (defined in DNS records). The SPF record tells the mail server _"here are some originating IP addresses that are legit, if a message arrives pretending to be from this domain, make sure the originating IP address is on this list"_.

### Using GMail and SES?

If you happen to be sending emails through Google Apps and [Amazon SES](http://aws.amazon.com/ses/) (e.g. automated system emails via SES **and** "real" person-to-person emails via GMail), you need to ensure that your SPF record is set up to allow for both domains.

So here's how: put this in your DNS system's `TXT` and `SPF` record ([why both?](http://en.wikipedia.org/wiki/Sender_Policy_Framework#Controversy)):

```text
"v=spf1 include:amazonses.com include:_spf.google.com ~all"
```

See here for more information from Google: https://support.google.com/a/answer/178723?hl=en

### Links
	
* Overview of Sender Policy Framework: [http://www.openspf.org/](http://www.openspf.org/)
* List of qualifiers (difference between `~all` and `-all`): [http://en.wikipedia.org/wiki/Sender_Policy_Framework#Qualifiers](http://en.wikipedia.org/wiki/Sender_Policy_Framework#Qualifiers)
* Check your SPF records: [http://spf.myisp.ch/](http://spf.myisp.ch/)
* Validate your SPF records: [http://www.kitterman.com/spf/validate.html](http://www.kitterman.com/spf/validate.html)
