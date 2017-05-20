const fs = require('fs');
const { ChromeEventTarget, loadScript } = require('./test-utils');
const backgroundScript = loadScript('../extension/background');

class BackgroundDriver {
    constructor() {
        this.lastMessage = {};
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
                onConnect: this._onConnect
            }
        };

        backgroundScript.runInNewContext({ chrome, console, Array });
    }

    respond(cmd, response) {
        expect(this.lastMessage.cmd).toBe(cmd);
        this.nativePort.onMessage.dispatch(Object.assign({}, response, {
            _id: this.lastMessage._id,
            _type: 'response'
        }));
    }
}

exports.BackgroundDriver = BackgroundDriver;
