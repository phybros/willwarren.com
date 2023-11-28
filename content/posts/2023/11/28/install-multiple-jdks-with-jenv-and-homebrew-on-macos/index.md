---
title: "Install and Use Multiple JDKs with jenv and Homebrew on macOS"
description: "For anyone who needs to have many different versions of Java installed on their macOS machine. It goes over installation of `jenv` and various JDKs as well as how to switch between them"
date: 2023-11-28
type: "post"
tags: [java, coding, macos]
draft: false
---

A short post for anyone who needs to have many different versions of Java installed on their macOS machine. It goes over
installation of `jenv` and various `temurin` JDKs as well as how to switch between them super easily.


## Install `jenv`

Installation via [Homebrew](https://brew.sh/) is easy 

```bash
brew install jenv
```

<!--more-->

Configure `jenv` to work in your shell by adding the following to your `.zshrc` (or `.bashrc` etc)

```bash
export PATH="$HOME/.jenv/bin:$PATH"
eval "$(jenv init -)"
```

## Install JDK

Install the latest JDK via Homebrew casks:

```bash
brew install --cask temurin
```

To install multiple versions side-by-side do this:

```bash
brew tap homebrew/cask-versions
brew search temurin # this will list all the versions you can install
brew install --cask temurin17 temurin20 temurin21 # etc...
```

## Add the JDKs to `jenv`

Once installed you can add them to `jenv` like so

```bash
jenv add /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
jenv add /Library/Java/JavaVirtualMachines/temurin-20.jdk/Contents/Home
# ... etc
```

## Using `jenv`

Then switch between them in your shell with

```bash
jenv shell 20 # switch your shell to JDK 20
java -version # print the current version!

openjdk version "20.0.2" 2023-07-18
OpenJDK Runtime Environment Temurin-20.0.2+9 (build 20.0.2+9)
OpenJDK 64-Bit Server VM Temurin-20.0.2+9 (build 20.0.2+9, mixed mode)
```

## More Tips

You could also make some shell aliases to make it even easier/faster:

```bash
javahome() {
  jenv shell $1
  java -version
}

alias j17='javahome 16'
alias j18='javahome 17'
alias j20='javahome 20'
alias j21='javahome 21'
```

Now you can just do `j17` in the shell etc.

### Even More Tips

- You can list all the versions of Java that `jenv` knows about with `jenv versions`.
- Configure the global default java version with `jenv global 20`
- If anything ever seems wonky, or JDKs are (re)moved, run `jenv rehash` to fix them

Hopefully this post can help someone!
