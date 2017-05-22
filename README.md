# Windows 10 Web Bluetooth Polyfill

The Polyfill enables Web Bluetooth in Chrome on Windows 10. 

[![Build Status](https://travis-ci.org/urish/web-bluetooth-polyfill.png?branch=master)](https://travis-ci.org/urish/web-bluetooth-polyfill)

## Installation

1. You need to have Windows 10 Creators Update (build 15063) or newer
2. Clone this repo: `git clone https://github.com/urish/web-bluetooth-polyfill`
3. Open Chrome Extensions pane (chrome://extensions/) and enable "Developer Mode" (there is a checkbox on top of the page)
4. Click the "Load unpacked extension..." button
5. Choose the `extension` folder inside the cloned repo
6. Download the latest [BLEServer](https://github.com/urish/web-bluetooth-polyfill/releases/) and unpack it inside `C:\Program Files (x86)\Web Bluetooth Polyfill`
7. Run `C:\Program Files (x86)\Web Bluetooth Polyfill\register.cmd` to register the Native Messaging server

That's it! Enjoy Web Bluetooth on Windows :-)

## Current State

TL;DR - Should work out of the box with most Web Bluetooth apps.

Most of the functionality is already there, but there might be slight differences between the current implementation and the spec. Device Chooser UI is still missing, so the first matching device is picked up automatically. Check out the [list of issues](https://github.com/urish/web-bluetooth-polyfill/issues) to see what is currently still missing. Pull Requests are very welcome!

List of API methods / events and their implementation status:

- [X] requestDevice
- [ ] Device Chooser UI ([#1](https://github.com/urish/web-bluetooth-polyfill/issues/1))
- [X] gatt.connect
- [X] gatt.disconnect
- [X] gattserverdisconnected event
- [ ] serviceadded / servicechanged / serviceremoved events ([#3](https://github.com/urish/web-bluetooth-polyfill/issues/3))
- [X] getPrimaryService / getPrimaryServices
- [X] getCharacteristic / getCharacteristics
- [X] writeValue
- [X] readValue
- [X] startNotifications / characteristicvaluechanged event
- [ ] stopNotifications ([#4](https://github.com/urish/web-bluetooth-polyfill/issues/4))
- [ ] getIncludedService / getIncludedServices ([#5](https://github.com/urish/web-bluetooth-polyfill/issues/5))
- [ ] getDescriptor / getDescriptors ([#6](https://github.com/urish/web-bluetooth-polyfill/issues/6))

## Running tests

If you want to run tests, during local development, you will need [node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/). Then, run the following commands:

    yarn
    yarn test
    
You can also run the tests in watch mode, which will only run tests related to files changed since the last commit:

    yarn run test:watch


