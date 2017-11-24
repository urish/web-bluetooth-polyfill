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

    _expandUuid(uuid) {
        if (typeof uuid === 'number' && uuid > 0) {
            uuid = uuid.toString(16);
            while (uuid.length < 8) {
                uuid = '0' + uuid;
            }
            return `${uuid}-0000-1000-8000-00805f9b34fb`;
        }
        return uuid;
    }

    expect(cmd, response) {
        this._expectation = [cmd, response];
    }

    sendMessage(message) {
        this.nativePort.onMessage.dispatch(message);
    }

    autoRespond(responseTable) {
        this.nativePort.postMessage.mockImplementation(msg => {
            this.lastMessage = msg;
            expect(Object.keys(responseTable)).toContain(msg.cmd);
            const response = responseTable[msg.cmd](msg);
            this.sendMessage(Object.assign({}, response, {
                _id: msg._id,
                _type: 'response',
            }));
        });
    }

    advertiseDevice(name, id, services = []) {
        this.autoRespond({
            scan: () => {
                setImmediate(() => {
                    this.sendMessage({
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

    simulateDevice(serviceUuid, characteristicUuid, properties) {
        this.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
            'services': () => ({ result: [this._expandUuid(serviceUuid)] }),
            'characteristics': () => ({
                result: [{
                    uuid: this._expandUuid(characteristicUuid),
                    properties: Object.assign({
                        broadcast: false, read: false, writeWithoutResponse: false, write: false,
                        notify: false, indicate: false, authenticatedSignedWrites: false,
                        reliableWrite: false, writableAuxiliaries: false,
                    }, properties),
                }],
            }),
        });
    }
}

exports.BackgroundDriver = BackgroundDriver;
