+++
date = "2018-07-13T10:30:00-05:00"
ogimage = ""
title = "Upgrading a Hugo Website from 0.27 to 0.44"
tags = ["website", "howto"]

+++

This website is powered by Hugo - a static site generator written in Go. [I've written about it before](/2015/04/05/goodbye-wordpress-hello-hugo) and really enjoy using it. Using Hugo, I've removed all the obstacles from getting content out there - now it's just my own laziness in the way...

For years, I've had a Jenkins job that builds the site, uploads it to S3 and creates a CloudFront cache invalidation every time the Git repo changes. This all works great, but I haven't updated the version of the `hugo` binary in my Jenkins docker image since `v0.27.1`. The latest version (at time of writing) is `v0.44` so I figured I'd just try the new version and see what happens! Will my custom theme make it?

**Things broke!**

Here's how I fixed them!
<!--more-->

## Use partial instead of template

The old advice for including other partials in pages was to use the `template` keyword. I had this sort of thing in my main `single.html`:

```html
{{ template "theme/partials/singlehead.html" . }}
    <body>
        {{ template "theme/partials/singleheader.html" . }}
```

THis makes Hugo error out with an error like: `Partial "theme/partials/singleheader.html" not found`. According to the docs, we don't use `template` any more and just use `partial` instead with shortened paths:

```html
{{ partial "singlehead.html" . }}
    <body>
        {{ partial "singleheader.html" . }} 
```

I had this issue across a ton of other themes files too, but now my custom theme is good to go on `v0.44`.

## Syntax highlighting

Hugo has switched from `pygments` to `Chroma` which is fine, but it seems like the `config.toml` file has gotten a bit more picky.

I had

```toml
pygmentsstyle = "github"
```

Which was no longer working (it was using the default theme). I changed it to `pygmentsStyle` (with capital S) and now it's good!

I also learned about `pygmentsCodeFences` setting which lets you use normal (and portable) markdown code fences with a specified language instead of Hugo's shortcodes. I also changed from the pygments "github" style to the Chroma "manni" style!

Hopefully this can help someone else doing this big of a version jump with their own site!
