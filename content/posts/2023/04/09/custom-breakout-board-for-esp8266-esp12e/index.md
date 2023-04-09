---
title: "Custom breakout board for the ESP-12E WiFi Module"
date: 2023-04-08
type: "post"
tags: [electronics, esp8266, esp12, kicad]
draft: false
---

The ESP-12E is an awesome low-power WiFi-capable module with an ESP8266 inside.

Unfortunately for prototypers and tinkerers alike, the footprint of the module
doesn't lend itself well to experimenting with ideas on (for example)
solderless breadboards.

The pitch (distance between pins) on the module is 2mm, whereas breadboards, 
perfboard, veroboard, stripboard etc use 2.54mm.

<!--more-->

My first pass at getting something going was this lovecraftian horror:

{{< figure 
    src="IMG_0068.jpeg"
    link="IMG_0068.jpeg"
    target="_blank"
    alt="The ESP-12E suspended above a breadboard by some crudely soldered-on wires."
    title="The ESP-12E suspended above a breadboard by some crudely soldered-on wires."
    caption="We can probably do better than this"
>}}

# KiCAD to the rescue

I had done a couple of basic PCB designs before, but decided to go deeper into
KiCAD this time and ended up with this design:

{{< figure 
    src="ESP-12EBreakoutPCB.jpeg"
    link="ESP-12EBreakoutPCB.jpeg"
    target="_blank"
    alt="PCB for the breakout board as seen inside KiCAD"
    title="PCB for the breakout board as seen inside KiCAD"
    caption="I tried to make it as symmetrical as possible"
>}}

I really wanted to maximize the amount of breadboard holes you can access on
either side of the pins, which is why I ended up going with this strange sort
of elongated snake type of arrangement.

I tried to use thicker traces for the `3v3` and `GND` lines and short traces
leading to the vias underneath the module itself.

After a few days of waiting, JLCPCB sent me 5 of these:

{{< figure 
    src="populated-pcb.jpeg"
    link="populated-pcb.jpeg"
    target="_blank"
    alt="Populated PCB"
    title="Populated PCB"
    caption="Excuse the gnarly soldering job!"
>}}

Now that it's set up, we can plug it into a breadboard and get it powered up!

You can pull up/down various pins to control the way in which the module boots:

|Mode        |EN  |RST  |GPIO15|GPIO0|
|------------|:--:|:---:|:----:|:---:|
|**Download**|HIGH|HIGH |LOW   |LOW  |
|**Running** |HIGH|HIGH |LOW   |HIGH |

**TL;DR:** You just change `GPIO0` from HIGH to LOW when you want to program
it.

Here's some example circuits using the module. The left one always just boots
normally. The right one incorporates some buttons so you can reset the module
into Download Mode by holding the `BOOT` button and tapping `RESET`.

{{< figure 
    src="booting-ESP-12.png"
    link="booting-ESP-12.png"
    target="_blank"
    alt="Circuits to boot the ESP-12E"
    title="Circuits to boot the ESP-12E"
>}}

# Get the breakout boards

If you want some of the breakout boards yourself, you can download the KiCAD
project from Github here: <https://github.com/phybros/esp12-breakout>.

⚡️
