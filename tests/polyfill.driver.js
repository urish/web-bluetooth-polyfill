const vm = require('vm');
const EventTarget = require('event-target-shim');
const { ChromeEventTarget, loadScript } = require('./test-utils');
const polyfillScript = loadScript('../extension/polyfill');

class PolyfillDriver {
    constructor(background) {
        this._background = background;
        this._setup();
    }

    _setup() {
        const navigator = {};
        const window = new EventTarget();
        const port = {
            onDisconnect: new ChromeEventTarget(),
            onMessage: new ChromeEventTarget(),
            postMessage: msg => {
                window.postMessage(Object.assign({}, msg, {
                    type: 'WebBluetoothPolyCSToPage'
                }));
            }
        };
        window.addEventListener('message', event => {
            if (event.data.type === 'WebBluetoothPolyPageToCS') {
                port.onMessage.dispatch(JSON.parse(JSON.stringify(event.data)));
            }
        });
        window.postMessage = function (message, origin) {
            this.dispatchEvent({ 'type': 'message', data: message, source: this });
        }
        const mockConsole = {
            log: jest.fn((...args) => {
                if (args[0] !== 'Windows 10 Web Bluetooth Polyfill loaded') {
                    console.log(...args);
                }
            })
        };
        polyfillScript.runInNewContext({ window, navigator, console: mockConsole });
        this._background._onConnect.dispatch(port);
        this.bluetooth = navigator.bluetooth;
    }
}

exports.PolyfillDriver = PolyfillDriver;
