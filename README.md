# VIVI SPECIFIC NOTES

The `BLEServer` executable is required for the proper operation fo `noble-winrt`. Hopefully, this becomes obsolete with the implementation of the Chrome web bluetooth API, but for now, the web bluetooth API does not allow for a BLE scan of multiple devices. That means that we can only see the information for one box at a time.

When a device advertises with BLE, the payload contains a number of "AD structures". AD structures contain data such as the name of a device, the signal strength, and manufacturer data. In the unmodified version of `web-bluetooth-polyfill`, only a select few AD structures are read, including the name, transmission power, and service UUIDs. This means that it does not read our "service data" AD structure that contains the beacon information.

This mirror of `web-bluetooth-polyfill` contains a patch that dumps the raw data of all the AD structures when it discovers a bluetooth peripheral. This allows us to parse this data in javascript to retrieve the relevant information.

To use this repository, build the `BLEserver` executable (`BLEServer.vcxproj`) using visual studio or `msbuild` and copy the executable into the `prebuilt` folder of the vivi `noble-winrt` repository.

If you have any trouble with visual studio not being able to find `platform.winrt`, then make sure that the `Additional #using directories` is correct. The setting can be found in the `BLEServer` project under `C/C++` general settings.

# Windows 10 Web Bluetooth Polyfill

The Polyfill enables Web Bluetooth in Chrome on Windows 10. 

[![Build Status](https://travis-ci.org/urish/web-bluetooth-polyfill.png?branch=master)](https://travis-ci.org/urish/web-bluetooth-polyfill)

## Depracted - Web Bluetooth is now available in Chrome

Native Web Bluetooth support is [now available on Chrome for Windows](https://github.com/WebBluetoothCG/web-bluetooth/blob/master/implementation-status.md#chrome).

**This polyfill is no longer required and is now deprecated.**

## Installation

1. You need to have Windows 10 Creators Update (version 1703 / build 15063) or newer
2. You also need [Visual C++ Redistributable for Visual Studio 2015 (x86)](https://www.microsoft.com/en-us/download/details.aspx?id=48145), if not already installed
3. Clone this repo: `git clone https://github.com/urish/web-bluetooth-polyfill`
4. Open Chrome Extensions pane (chrome://extensions/) and enable "Developer Mode" (there is a checkbox on top of the page)
5. Click the "Load unpacked extension..." button
6. Choose the `extension` folder inside the cloned repo
7. Take a note of the extension ID for the newly added extension, you will need it in step 8. The ID is a long string of lowercase english letters, e.g. `mfjncijdfecdpkfldkechgoadojddehp`
8. Download the latest [BLEServer](https://github.com/urish/web-bluetooth-polyfill/releases/) and unpack it inside `C:\Program Files (x86)\Web Bluetooth Polyfill`
9. Edit `C:\Program Files (x86)\Web Bluetooth Polyfill\manifest.json` and change the extension id in the `allowed_origins` section to match the extension ID you found in step 6
10. Run `C:\Program Files (x86)\Web Bluetooth Polyfill\register.cmd` to register the Native Messaging server

That's it! Enjoy Web Bluetooth on Windows :-)

## Troubleshooting

1. Run the `winver` program to verify that you have Windows 10 Creators Update. It should display: "Version 1703 (OS Build 15063.413)" or higher.
2. Try to running `C:\Program Files (x86)\Web Bluetooth Polyfill\BLEServer.exe` manually. If an error message containing something like `"VCRUNTIME140.dll is missing"` appears, install [Visual C++ Redistributable for Visual Studio 2015 (x86)](https://www.microsoft.com/en-us/download/details.aspx?id=48145). Then launch `C:\Program Files (x86)\Web Bluetooth Polyfill\BLEServer.exe` one more time. If a black window containing `{"_type":"Start"}` appears, then the BLEServer is working correctly. Although since Windows 10 build 1709 it can still be blocked from running by Windows Defender SmartScreen so Chrome won't be able to start it by itself. You may disable SmartScreen for applications and programs in Windows Defender settings. It's also worth making sure that `Web Bluetooth Polyfill` folder and files inside have window's users permissions for read, write and execution ( right click -> properties -> security ).
3. Make sure "Experimental Web Platform Features" flag is *disabled*. You can set it using this link: chrome://flags/#enable-experimental-web-platform-features
4. Open the Devtools console of any web page, and look for the message: "Windows 10 Web Bluetooth Polyfill loaded". If you don't see this message, it means that either the extension was not installed correctly, or you already have something setting the `navigator.bluetooth` object to some value.
5. Follow the [instructions here](https://github.com/urish/web-bluetooth-polyfill/issues/21#issuecomment-308990559) to debug the background page of the extension.

## Current State

TL;DR - Should work out of the box with most Web Bluetooth apps.

Most of the functionality is already there, but there might be slight differences between the current implementation and the spec. Device Chooser UI is still missing, so the first matching device is picked up automatically. Check out the [list of issues](https://github.com/urish/web-bluetooth-polyfill/issues) to see what is currently still missing. Pull Requests are very welcome!

List of API methods / events and their implementation status:

- [X] requestDevice
- [X] Device Chooser UI 
- [X] gatt.connect
- [X] gatt.disconnect
- [X] gattserverdisconnected event
- [ ] serviceadded / servicechanged / serviceremoved events ([#3](https://github.com/urish/web-bluetooth-polyfill/issues/3))
- [X] getPrimaryService / getPrimaryServices
- [X] getCharacteristic / getCharacteristics
- [X] writeValue
- [X] readValue
- [X] startNotifications / characteristicvaluechanged event
- [x] stopNotifications
- [ ] getIncludedService / getIncludedServices ([#5](https://github.com/urish/web-bluetooth-polyfill/issues/5))
- [ ] getDescriptor / getDescriptors ([#6](https://github.com/urish/web-bluetooth-polyfill/issues/6))

## Running tests

If you want to run tests, during local development, you will need [node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/). Then, run the following commands:

    yarn
    yarn test
    
You can also run the tests in watch mode, which will only run tests related to files changed since the last commit:

    yarn run test:watch


