---
date: "2015-04-05"
ogimage: images/2015/04/kittens.jpg
slug: goodbye-wordpress-hello-hugo
tags:
- design
- aws
- opinion
- website
title: Goodbye WordPress; Hello Hugo
---

As part of my regular annual website refresh, I decided to take a pretty drastic step and move from WordPress to a static site generator called [Hugo](http://gohugo.io). I've kept my WordPress install continually up to date since early 2009 and it served me well, but I needed a change. I also went back through the archives and culled all my old blog posts - I only kept the most trafficked and the ones that _Future Will_ might want to reference.<!--more-->

{{< figure src="/images/2015/04/Screenshot 2015-03-30 12.06.25.png" link="/images/2015/04/Screenshot 2015-03-30 12.06.25.png" title="New shiny theme in action" alt="Screenshot of new theme" >}}

Now with the source files written in Markdown, I'm able to hack away in Sublime Text to write my posts, and then with a simple `git push` and a little help from [Jenkins](https://jenkins-ci.org) they are deployed to my website. Writing posts in markdown is a little controversial, but I am personally a fan. It helps me focus on the content rather than the formatting and presentation.

## Using Hugo
Since Hugo is written in Go it's a breeze to install, especially on OSX. I was up and running in seconds by using `brew install hugo`. It's just as simple on Windows. Here are some more of the commands typically used:

* Create a new site: `hugo new site /path/to/site`
* Create a new page: `hugo new my-new-page.md`
* Create a new blog post: `hugo new 2015/04/05/my-awesome-blog-post.md`
	* Note: I only use the `yyyy/mm/dd/post-name` URL structure to maintain links from my old site that are sprinkled around the internet as well as historical Analytics records

**Note:** _I found out just as I was wrapping up this project that you can actually just dump all your Markdown files in one dir and configure Hugo to split them into the `yyyy/mm/dd/post-name` structure by itself at runtime, rather than having to manage the unwieldy directory structure. Future enhancement!_

That's pretty much it from a content perspective. Once that was figured out it was time for the fun stuff: themes!

## New Site, New Theme
Hugo provides lots of options for Themes, as well as a large repository of themes that others have built already (see here: https://github.com/spf13/hugoThemes). None of the ones I tried really fit my needs so I just created my own from scratch. The [Hugo documentation](http://gohugo.io/templates/overview/) makes it super easy to get going. You can begin with just a single command: `hugo new theme <theme name>`.

I took inspiration from [Stripe's blog](https://stripe.com/blog) which has a really nice clean design that focuses on the content. I wanted to achieve the same sort of look - lots of whitespace to let the content breathe.

### Images
I kept the use of Fancybox around from my previous website, but I also changed the way that images were displayed. They are full width now and have a little caption underneath:

{{< figure src="/images/2015/04/kittens.jpg" link="/images/2015/04/kittens.jpg" alt="Awesome picture of some kittens" title="Now I can post photos of kittens like never before!" >}}

### Code
Code snippets are also contained in a full width block, but the code itself is constrained to the same width as the rest of the content like so:

```c
#include <stdio.h>

int main(void) {
	printf("Hello, World!\n");
	return 0;
}
```

## Hacking the deploy process
I keep all the site content in a private Git repo up on Bitbucket. Whenever I make a push to the git repo's `master` branch, my overly complicated deployment process is invoked.

The Bitbucket repo is configured with a [webhook](https://confluence.atlassian.com/display/BITBUCKET/Manage+Webhooks) to send my home server a POST when I commit and push to the repo. I have a tiny script sitting waiting for that hook, and when it is received it downloads the latest code, runs `hugo` and then uses `aws s3 sync` to send the compiled HTML to Amazon S3.

I will probably tweak and change the setup as I go, but for now it works.

## Why go static?
Not having a server-side CMS means that you can host it pretty much wherever you want. I chose Amazon S3 for the low costs and high availability. It also limits the attack surface if someone is trying to hack their way into your web server. Since there is no PHP, there is nothing to exploit - it's just boring HTML files.

I'm also a big fan of Markdown in general as I think it's got just the right amount of semantics to allow you to express yourself but not so much that you get bogged down in formatting.

Static site generators are a relatively new thing, but they've been getting much more popular in the last few years:

{{< figure src="/images/2015/04/Screenshot 2015-04-07 07.39.39.png" link="/images/2015/04/Screenshot 2015-04-07 07.39.39.png" alt="Google trends graph" title="Google searches for 'static site generator' over time." >}}

That said, if your site relies on lots of dynamic content pulled from databases or you require logins/passwords/sessions then static is probably not the way to go for you. If you're just a hacker who wants to write blog posts, then maybe you should check it out.

Have you converted your site to a static site generator? Let me know your experiences in the comments!
