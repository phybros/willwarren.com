---
Description: ""
date: "2014-06-19"
slug: notes-switching-osx-windows
tags:
- irl
title: Notes on switching to OSX from Windows
---

I recently got a new MacBook Pro as my new work machine. As someone who's never used a Mac for any serious length of time, it was quite a culture shock. <!--more-->

## Work

{{< figure class="float-left" src="/images/2014/06/idea.png" alt="IntelliJ IDEA Logo" >}}

My job involves a lot of Java web development. Lots of compiles, debugging, testing etc. I used [Intellij IDEA](http://www.jetbrains.com/idea/) on Windows, and it works great (and looks much nicer) on OSX so the hardest part was getting used to a whole new set of hotkeys.

Server administration over SSH is actually easier on OSX due to the built in SSH functionality in the terminal. The only downside is now you have to find an alternative method for maintaining all your bookmarks (tip: use Shuttle, it's linked below).

## Play

All work and no play makes Will a dull boy - sometimes I like to break out the video games and listen to music as well.

### Gaming

Some of my favorite Steam games (CS:GO, Borderlands 2, FTL) are also available through Steam on OSX and they perform amazingly on this machine.

{{< figure link="/images/2014/06/Screenshot-2014-06-19-14.34.35.png" src="/images/2014/06/Screenshot-2014-06-19-14.34.35.png" title="Borderlands 2 running on OSX - I can still get my sweet sweet loot!" alt="Borderlands 2 running on OSX" >}}

**UPDATE:** I decided to do Bootcamp with my OSX partition so that I could play more of the games that I own on Steam - namely PAYDAY2 and Skyrim that don't work natively on OSX via Steam.

### Music

I used to try and avoid iTunes like the plague, but on OSX it actually doesn't suck. It plays all my music with no issues and has some really nice features - not to mention OS integration. I just pointed at my music library and it was good to go. It even cleaned up some missing album art here and there.

## Make the transition easier

Some steps I took that made the migration easier

  * Install [Homebrew](http://brew.sh/) as soon as you can.	
    * `brew install bash-completion`
    * `brew install git` (do yourself a favor and don't use the official OSX installer from the git website)	
    * `brew install git-extras`	
    * `brew install wget`	
  * Install [Shuttle](http://fitztrev.github.io/shuttle/) to replace PuTTY and manage your SSH bookmarks	
    * Use `brew install putty` to get `puttygen` which can convert your `.ppk` files into OpenSSH private keys	
  * Use the built in [Mail](https://www.apple.com/ca/osx/apps/#mail) client (it's really good)	
  * Use the built in [Calendar](https://www.apple.com/ca/osx/apps/#calendar) app (it's also really good)	
  * Use [Sublime Text](http://www.sublimetext.com/3) instead of TextEdit

## Files & Data

As far as moving files over, most of my important stuff is in Dropbox and Google drive anyway, so I didn't need to copy much over. I have a number of VMs which run on VirtualBox (also available on OSX), so I copied those over and that was it.

If you have your Dropbox fully synced on another machine on your LAN, it will just pull the files over your local network instead of the internet which vastly decreases sync time.

I'll keep this post updated with any other new tidbits I uncover, but all in all, I'm really happy with the switch so far.
