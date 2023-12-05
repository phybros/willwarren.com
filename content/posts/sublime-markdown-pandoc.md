---
customstyle: ""
date: "2015-07-08"
ogimage: /images/2015/07/homer-shaking-fist.gif
tags:
- coding
title: Creating Sublime Documentation with Markdown and Pandoc
---

Documentation is one of those things that's easy to down-prioritize to the very bottom of your todo list, even though it could be one of the most important tasks that you undertake in your day to day job.

The amount of times I've gone back to old code, or some old system and cursed *Past Will* for not creating any sort of documentation is beyond measure.
<!--more-->
{{< figure src="/images/2015/07/homer-shaking-fist.gif" link="/images/2015/07/homer-shaking-fist.gif" title="Curse you Past Will!!" alt="GIF of Homer Simpson screaming and shaking his fists at the sky" >}}

Writing documentation can be pretty boring and mind-numbing so maybe I can forgive Past Will a little bit. But how do we improve this situation?

## Sublime Text + Markdown + Pandoc = Awesome docs

Using tools many hackers are already familiar with is the key to success. I already do lots of writing in Markdown (see this very website for example) and I am an avid user of Sublime Text, so how can I make these awesome tools also awesome for creating documentation? Pandoc, that's how.

Apologies in advance for the Mac OSX only instructions here, but they should be easily adapted to other platforms.

### Step 1: Get Pandoc

Pandoc is a utility that is able to convert just about any document format to just about any other document format.

If you already [have Homebrew installed](http://brew.sh) you can just:

```bash
brew install pandoc
```

### Step 2: Install MacTeX

This step is required if you want to be able to create PDF documents, so you will probably want to install it. Just grab the "smaller BasicTeX" package from here: https://tug.org/mactex/.

### Step 3: Install the Pandoc Sublime Text package

Again, this is optional, but it makes the whole process much easier. Using package control, you can just search for the package "Pandoc" and install.

I had to make a modification to the default PDF rendering settings of the Pandoc package to tell it where to find MacTeX. If not, you might get an error like:

> pandoc: pdflatex not found. pdflatex is needed for pdf output.
> Error: pandoc document conversion failed

Also to enable table of contents you'll need to update the settings. Here's my User Settings file for Pandoc (includes some bonus Microsoft Word settings!):

```json
{
  "user": {
    "transformations": {
      "PDF": {
        "scope": {
          "text.html": "html",
          "text.html.markdown": "markdown",
          },
        "pandoc-arguments": [
          "-s", "--toc", "--number-sections",
          "--variable", "geometry:margin=1.25in",
          "-t", "pdf",
          "--latex-engine=/usr/local/texlive/2015basic/bin/universal-darwin/pdflatex"
        ],
      },

      "Microsoft Word": {
        "scope": {
          "text.html": "html",
          "text.html.markdown": "markdown"
        },
        "pandoc-arguments": [
          "-t", "docx",
          "-s", "--toc", "--number-sections"
        ]
      }
    }
  }
}
```

**Note:** your path to `pdflatex` might be different to mine, so adjust accordingly.

### Step 4: Create awesome docs

This part should be easy! Just write some Markdown like so:

```md
# My First Section
Collaboratively administrate empowered markets via plug-and-play networks.
Dynamically procrastinate B2C users after installed base benefits.
Dramatically visualize customer directed convergence without revolutionary
ROI.

Efficiently unleash cross-media information without cross-media value.
Quickly maximize [timely deliverables](https://google.com) for real-time
schemas. Dramatically maintain clicks-and-mortar solutions without
functional solutions.

# My Second Section
Completely synergize resource sucking relationships via premier niche
markets. Professionally cultivate one-to-one customer service with
robust ideas. Dynamically innovate _resource-leveling_ customer service
for state of the art customer service:

 * Innovate
 * Synergy-as-a-Service
 * Proactive
 * Interactively Process-Centric

## My Sub Section!
Proactively envisioned multimedia based expertise and cross-media growth
strategies. Seamlessly visualize quality intellectual capital without
superior collaboration and idea-sharing. **Holistically** pontificate
installed base portals after maintainable products.
```

Now using the Sublime Text command palette, just type "Pandoc" and choose your desired output format. I chose PDF and this is what was produced:

{{< figure src="/images/2015/07/markdown-pdf.png" link="/images/2015/07/markdown-pdf.png" title="Doesn't it look pretty?" alt="Screenshot of resultant PDF file" >}}

Of course, you can customize the numbering and table of contents using the Pandoc User Settings file I talked about in Step 3.

You can also add a really awesome title and subtitle by adding these to the top of your Markdown file:

```text
% My Awesome Document Title
% This is my subtitle
```

### Step 5: Write the docs

This is probably the most important step: actually write your documentation. Future Will will thank you :)
