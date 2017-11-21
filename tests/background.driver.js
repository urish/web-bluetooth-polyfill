/* eslint-env node, jest */

const vm = require('vm');

const { ChromeEventTarget, loadScript } = require('./test-utils');
const backgroundScripts = [
    loadScript('../extension/gatt-services'),
    loadScript('../extension/gatt-characteristics'),
    loadScript('../extension/background'),
];

class BackgroundDriver {
    constructor() {
        this.lastMessage = {};
        this._expectation = null;
        this._setup();
    }

    _setup() {
        this.nativePort = {
            onMessage: new ChromeEventTarget(),
            onDisconnect: new ChromeEventTarget(),
            postMessage: jest.fn(msg => {
                this.lastMessage = msg;
            }),
        };
        this._onConnect = new ChromeEventTarget();
        const chrome = {
            runtime: {
                connectNative: jest.fn().mockReturnValue(this.nativePort),
                onConnect: this._onConnect,
            },
        };

        const context = vm.createContext({ chrome, console, Array });
        for (const script of backgroundScripts) {
            script.runInContext(context);
        }
    }

    expect(cmd, response) {
        this._expectation = [cmd, response];
    }

    autoRespond(responseTable) {
        this.nativePort.postMessage.mockImplementation(msg => {
            this.lastMessage = msg;
            expect(Object.keys(responseTable)).toContain(msg.cmd);
            const response = responseTable[msg.cmd](msg);
            this.nativePort.onMessage.dispatch(Object.assign({}, response, {
                _id: msg._id,
                _type: 'response',
            }));
        });
    }

    advertiseDevice(name, id, services = []) {
        this.autoRespond({
            scan: () => {
                setImmediate(() => {
                    this.nativePort.onMessage.dispatch({
                        _type: 'scanResult',
                        bluetoothAddress: id,
                        localName: name,
                        serviceUuids: services,
                    });
                });
                return { result: null };
            },
            stopScan: () => ({ result: null }),
        });
    }
}

exports.BackgroundDriver = BackgroundDriver;
