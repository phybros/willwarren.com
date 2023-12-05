+++
date = 2017-10-18
title = "Handy shell alias for taking notes"
ogimage = "images/2017/10/n.png"
tags = ["opinion", "coding"]

+++

I keep my personal nodes in a bunch of Markdown files inside a Dropbox folder. I've used just about every note-taking app there is and ended up settling on this system. It's served me really well so far.

I have one note at the top level called `scratch.md` that I use for quickly writing things down when I'm in a hurry. I decided to speed this up even more with this little shell alias:
<!--more-->

```bash
# Should work fine in bash or zsh
n() {
    nf="$HOME/Dropbox/Notes/scratch.md"

    date +'%n## %Y-%m-%d %H:%M:%S' >> $nf
    nano +999999 $nf
}
```

I have that in my `.zshrc` (would work fine in `.bashrc` too), then when I'm in a terminal (I'm always in a terminal) I can just run `n` and it will add a new line with the current timestamp as a heading (`## 2017-10-18 22:54:23`) and open nano with the cursor at the bottom ready to type.

That's right I use `nano`. Come at me, `emacs` and `vim` people.
