+++
date = "2020-03-19T10:30:00-04:00"
ogimage = "images/2020/03/boxes.png"
title = "2020 Website Refresh: More Automation Edition"
tags = ["website", "howto", "automation"]
toc = false
draft = false

+++

It's been over 10 months since [my last blog post](/2019/05/running-kubernetes-on-ubuntu-18-04-virtualbox/) on here, and I decided it was
high time for a fresh look at the site. Not to mention I'm on lockdown because
of [COVID-19](https://en.wikipedia.org/wiki/Coronavirus_disease_2019). It seemed like as good a time as any to do some spring cleaning both in real life, and online.
<!--more-->

## Minor Visual Updates

I decided to make some tiny updates to the site style, most notably a new font
for headings.

{{< figure src="/images/2020/03/heading-font.png" link="/images/2020/03/heading-font.png" alt="New heading font: Merriweather" title="The font is called Merriweather" >}}

Next I also made a few tiny changes to the background color, and the drop
shadow around each blog post. The colour changes are barely perceptible, but
it made me happy to make it into a gradient instead of a flat gray.

{{< figure src="/images/2020/03/boxes.png" link="/images/2020/03/boxes.png" alt="New drop shadow, new gradient, new circle picture" title="New drop shadow, new gradient, new circle picture" >}}

Lastly, I also changed the header. The home page has a big circular picture of
my ugly mug, and some more classy typography. Single post pages have a tiny
circle and still, classy typography just moved over to the right.

{{< figure src="/images/2020/03/single-header.png" link="/images/2020/03/single-header.png" alt="Classy typography and small circle" title="This saves space at the top" >}}

## Deployment Pipeline

This is where the real action is.

This site is powered by the 
[Hugo static site generator](https://gohugo.io/), and for the longest
time, it had been built by a Jenkins job running on my home server which I
would manually trigger. Jenkins would dutifully build the site using `hugo`,
upload the generated HTML to Amazon S3, and then create a cache invalidation
in AWS CloudFront to bust caches at
[POP](https://en.wikipedia.org/wiki/Point_of_presence)s around the world.

After recently "redoing" my server (post on that coming "soon") I never
recreated poor Jenkins' docker container and so if I had made any updates to
the site in the meanwhile, I would have had to build and deploy the site from
my laptop like a savage.

### Enter Bitbucket Pipelines


**Disclaimer:** I work at Atlassian, but [not on the Bitbucket team](https://trello.com) :)


I already host my website's git repo on Bitbucket so why not give pipelines a
whirl? It had been a long time since I had tried to use Pipelines and they've
really drastically improved pretty much everything about it.

Here is the `bitbucket-pipelines.yml` for this website:

```yaml
image: phybros/docker-hugo-builder:0.67.1

pipelines:
  branches:
    master:
      - step:
          name: Build and minify files
          script:
            - hugo --config willwarren.com.toml
            - minify -r -o public/ public/
          artifacts:
            - public/**

      - step:
          name: Deploy to S3
          deployment: Production
          script:
            - pipe: atlassian/aws-s3-deploy:0.4.1
              variables:
                AWS_DEFAULT_REGION: 'us-east-1'
                S3_BUCKET: 'willwarren.com'
                LOCAL_PATH: 'public/'
            - pipe: atlassian/aws-cloudfront-invalidate:0.3.1
              variables:
                AWS_DEFAULT_REGION: 'us-east-1'
                DISTRIBUTION_ID: 'EXXXXXXXXXXXA'
                PATHS: '/*'
```

The heavy lifting here is done by Bitbucket's "pipes" - little reusable stages
that are open source. You can see them all here:
<https://bitbucket.org/product/features/pipelines/integrations>.

There is one that basically does an `aws s3 sync` operation
(`atlassian/aws-s3-deploy:0.4.1`), and another that does `aws cloudformation
create-invalidation` (`atlassian/aws-cloudfront-invalidate:0.3.1`). These
reusable bits are so simple but really powerful when you start connecting them
all together.

To make the above work you need to add 2 repository variables 
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. You can do this by going to
Settings > Pipelines > Repository Variables. Don't forget to check the
**Secured** checkbox when adding the variables.

{{< figure src="/images/2020/03/repository-variables.png" link="/images/2020/03/repository-variables.png" alt="Adding repository variables" title="Adding repository variables" >}}

That's it! Now whenever I push to `master` the pipeline is triggered. It looks
something like this:

{{< figure src="/images/2020/03/pipeline-run.png" link="/images/2020/03/pipeline-run.png" alt="Running the pipeline" title="Running the pipeline" >}}

Now the only thing standing in the way of publishing more is writing more!

### Manual Deploys

If you add the line `trigger: manual` under `deployment: Production`, 
Bitbucket gives you a neat little button in the Pipeline run screen that you
have to click to allow the deployment to proceed. Super cool!

## Docker Image for Hugo

There was many details that I glossed over, but the most glaring is the first
line of the yaml file: `image: phybros/docker-hugo-builder:0.67.1`. I created
a new docker image specifically for building Hugo sites in CI/CD pipelines.

You can go check it out here: 
<https://hub.docker.com/r/phybros/docker-hugo-builder>. Currently only Hugo
`v0.67.1` is supported, but that can be easily changed.

Just send me a PR!
