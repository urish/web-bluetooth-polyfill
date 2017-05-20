class EventTarget {
    constructor() {
        this.listeners = new Set();
    }

    addListener(fn) {
        this.listeners.add(fn);
    }

    dispatch(...args) {
        Array.from(this.listeners).forEach(item => item(...args));
    }
}

exports.nativePort = {
    onMessage: new EventTarget(),
    onDisconnect: new EventTarget(),
    postMessage: jest.fn(),
};

exports.onConnect = new EventTarget();

exports.connectToBackground = function () {
    var port = {
        onMessage: new EventTarget(),
        onDisconnect: new EventTarget(),
        postMessage: msg => {
            window.postMessage(Object.assign({}, msg, {
                type: 'WebBluetoothPolyCSToPage',
            }), '*');
        },
    };
    window.addEventListener('message', message => {
        if (message.data.type === 'WebBluetoothPolyPageToCS') {
            port.onMessage.dispatch(message.data);
        }
    });
    exports.onConnect.dispatch(port);
    return port;
}

global.chrome = {
    extension: {
        getURL: () => ''
    },
    runtime: {
        connectNative: jest.fn().mockReturnValue(exports.nativePort),
        onConnect: exports.onConnect
    }
};