---
showDate: false
showReadingTime: false
title: "GARAGINATOR: Flasher"
showSummary: true
summary: Update your GARAGINATOR's firmware!
cover: false
---

This page will allow you to flash different versions of the GARAGINATOR firmware
onto your GARAGINATOR device.

## Instructions

1. Open this page in Google Chrome or Microsoft Edge
   1. Chrome-derived browsers will work too, such as Arc or Brave
1. Plug the GARAGINATOR into a computer via the USB-C port
1. Click the "INSTALL vX.X" button below for the version you want to install
1. Choose `USB JTAG/serial debug unit (...)` from the list of Serial devices
1. Follow the on screen prompts.
1. **WARNING:** If given the choice to `Erase` the whole device, this is effectively a factory reset and you will need to set GARAGINATOR up and pair again from scratch (most people will want to leave this Unchecked).

---

## ✨ HomeKit Firmware v1.3 (Latest)

<esp-web-install-button manifest="firmware/1.3/manifest.json">
<button slot="activate" class="inline-block !rounded-md bg-primary-600 px-4 py-1 !text-neutral !no-underline hover:!bg-primary-500 dark:bg-primary-800 dark:hover:!bg-primary-700">INSTALL v1.3</button>
</esp-web-install-button>

### Changelog

- Fixed an issue where commanding the door to close via HomeKit could cause it to open instead
- Firmware version number now shown in the captive portal

---

## HomeKit Firmware v1.2

<esp-web-install-button manifest="firmware/1.2/manifest.json">
<button slot="activate" class="inline-block !rounded-md bg-primary-600 px-4 py-1 !text-neutral !no-underline hover:!bg-primary-500 dark:bg-primary-800 dark:hover:!bg-primary-700">INSTALL v1.2</button>
</esp-web-install-button>

### Changelog

- Initial release!
- If your GARAGINATOR shipped before 2024-01-31 it has this version (unless you've updated since receiving it)

<script
    type="module"
    src="https://unpkg.com/esp-web-tools@9.4.3/dist/web/install-button.js?module"
    ></script>

---

Flasher powered by [esp-web-tools](https://github.com/esphome/esp-web-tools)!
