---
date: "2014-04-09"
ogimage: images/2014/04/heartbleed.png
slug: what-is-heartbleed-why-do-i-care
tags:
- sysadmin
- security
title: What is Heartbleed and why do I care?
---

{{< figure class="float-left" src="/images/2014/04/heartbleed.png" alt="Heartbleed logo - Credit: http://heartbleed.com" >}}

Heartbleed is a bug in the OpenSSL library that was publicly disclosed on April 7th, 2014 by an internet security firm called Codenomicon. With OpenSSL being the _defacto_ SSL library in both the Apache and nginx webservers, that potentially exposes [about two thirds of the internet](http://news.netcraft.com/archives/2014/04/08/half-a-million-widely-trusted-websites-vulnerable-to-heartbleed-bug.html). If we exclude the websites that don't use SSL at all, we are left with a nice round number: _half a million_.
<!--more-->
Half a million websites exposed to a security hole of this magnitude is completely unheard of in modern history. The mad scramble to get this hole plugged has been ongoing since the disclosure and has involved some major players with [Amazon AWS](http://http://aws.amazon.com/security/security-bulletins/aws-services-updated-to-address-openssl-vulnerability/), [GitHub](https://github.com/blog/1818-security-heartbleed-vulnerability), [Google](http://googleonlinesecurity.blogspot.ca/2014/04/google-services-updated-to-address.html) and many more putting out announcements about their remediation efforts in the last 48 hours. Here in Canada, the CRA (Canada Revenue Agency) actually [shut down all its online filing systems](http://www.thestar.com/business/2014/04/09/canada_revenue_agency_shuts_down_online_services_over_security_fears.html) until they could get it sorted out. Maybe a little late, but at least they're on top of it. Not bad for a monolithic federal department.

The cloud hosting company CloudFlare [apparently got wind of this bug about a week before anyone else](http://blog.cloudflare.com/staying-ahead-of-openssl-vulnerabilities) which begs the question - why did they get told before anyone else? Why didn't they or the researchers notify any of the major linux distributions? NDAs? We might never know, but either way this does not sound like a "responsible disclosure" to me. When security bugs like this are actually disclosed responsibly, poor sysadmins aren't up at 3am building custom RPMs while frantically revoking as many SSL certs as they possibly can.

### How did this happen?

The cause of the Heartbleed bug (a.k.a [CVE-2014-0160](http://cve.mitre.org/cgi-bin/cvename.cgi?name=cve-2014-0160)) was probably one of the rookiest mistakes you can make as a C programmer. Anyone who's ever written C code before will know the pain caused by not doing bounds checks when performing any kind of memory access. That's exactly [what happened here](https://github.com/openssl/openssl/commit/4817504d069b4c5082161b02a22116ad75f822b1).

### What's the damage?

In my opinion, the really sad part about all of this is that this bug has been floating around for over 2 years. Anyone who was savvy enough, and wanted to attack someone using this exploit enough will already have done so. The effects of this security breach are going to be felt for years as slow hosting companies neglect to upgrade in time, SSL certificate keys become compromised, people's account details get stolen and so on and so on.

### What do we sysadmins do about it?

The key things for sysadmins to do right now is upgrade their versions of `libssl` and `openssl` ASAP. Decent system administrators will get this done NOW (maybe sooner - get a time machine since we're 2 days in) using official channels or recompiling them yourself with the `OPENSSL_NO_HEARTBEATS` flag enabled. Good system administrators will also revoke their SSL certificates and issue new ones. Great sysadmins will also revoke/replace their SSL certificates with brand new ones generated using brand new shiny private keys since the old ones should be considered compromised as well.

### Wait, why do I care again?

Imagine a smart (but evil) attacker setting up a standard Man-in-the-middle attack and pretending to be your bank's online web portal. Normally this can't be done because your computer trusts this web portal because it identifies itself as legitimately being your bank using SSL (or TLS more specifically). The attacker can't impersonate your bank because he doesn't have the private keys necessary to use the SSL cert. Now imagine that your bank was vulnerable to Heartbleed. The attacker is now able to read off arbitrary 64k blocks of your bank's webserver's RAM and given enough time could potentially recover your bank's private keys.

Now our attacker has the cert and the private key and can set up shop wherever he likes posing as your bank. All that's left to do at that point is let the logins happen and he can harvest usernames/passwords/sessions to his heart's content.

So from a consumer point of view, any site on which you care a lot about security (or any site at all really) - **<del>change your passwords yesterday!</del> wait until the service has contacted you and informed you that the vulnerability is fixed, and then change your password!**

### What do regular people do about it?

<del>Need me to repeat it? **CHANGE YOUR PASSWORDS NOW.**</del>

**Update:** I jumped on the "change your passwords now" bandwagon, but as [a friend](http://attie.co.uk) pointed out to me it's vitally important to make sure that the services you use have fixed the vulnerability **BEFORE** changing your passwords. Wait for them to contact you telling you that they are no longer vulnerable.

### Links
	
* Need to check if your site's compromised? Use this excellent tool: [http://filippo.io/Heartbleed/](http://filippo.io/Heartbleed/)
* Need more info on Heartbleed? Go here: [http://heartbleed.com](http://heartbleed.com)
* Bruce Schneier's thoughts on it to help you understand just how serious this is: [https://www.schneier.com/blog/archives/2014/04/heartbleed.html](https://www.schneier.com/blog/archives/2014/04/heartbleed.html)
* The git commit that broke openssl: [https://github.com/openssl/openssl/commit/4817504d069b4c5082161b02a22116ad75f822b1](https://github.com/openssl/openssl/commit/4817504d069b4c5082161b02a22116ad75f822b1)
* The git commit that fixed it: [https://github.com/openssl/openssl/commit/731f431497f463f3a2a97236fe0187b11c44aead](https://github.com/openssl/openssl/commit/731f431497f463f3a2a97236fe0187b11c44aead)
* CloudFlare's blog post (read the comments!): [http://blog.cloudflare.com/staying-ahead-of-openssl-vulnerabilities](http://blog.cloudflare.com/staying-ahead-of-openssl-vulnerabilities)
* **Update**: Why you shouldn't change your passwords immediately: [http://grahamcluley.com/2014/04/heartbleed-bug-passwords](http://grahamcluley.com/2014/04/heartbleed-bug-passwords/?utm_source=rss&utm_medium=rss&utm_campaign=heartbleed-bug-passwords)
