const nativePort = chrome.runtime.connectNative('org.urish.web_bluetooth.server');
let debugPrints = false;

let requestId = 0;
let requests = {};
async function nativeRequest(cmd, params) {
    return new Promise((resolve, reject) => {
        requests[requestId] = { resolve, reject };
        const msg = Object.assign(params || {}, {
            cmd,
            _id: requestId++
        });
        if (debugPrints) {
            console.log('Sent native message:', msg);
        }
        nativePort.postMessage(msg);
    });
}

const subscriptions = {};
nativePort.onMessage.addListener((msg) => {
    if (debugPrints) {
        console.log('Received native message:', msg);
    }
    if (msg._type === 'response' && requests[msg._id]) {
        const { reject, resolve } = requests[msg._id];
        if (msg.error) {
            reject(msg.error);
        } else {
            resolve(msg.result);
        }
        delete requests[msg._id];
    }
    if (msg._type === 'valueChangedNotification') {
        const port = subscriptions[msg.subscriptionId];
        if (port) {
            port.postMessage(msg);
        }
    }
});

let portsObjects = new WeakMap();
const characteristicCache = {};

nativePort.onDisconnect.addListener(() => {
    console.log("Disconnected!", chrome.runtime.lastError.message);
});

function leftPad(s, count, pad) {
    while (s.length < count) {
        s = pad + s;
    }
    return s;
}

function normalizeUuid(uuid) {
    const origUuid = uuid;
    // TODO: complete this list
    var standardUuids = {
        // characteristics
        battery_level: 0x2a19,

        // services
        heart_rate: 0x180d,
        battery_service: 0x180f,
        cycling_power: 0x1818,
    }
    if (standardUuids[uuid]) {
        uuid = standardUuids[uuid];
    }
    if (typeof uuid === 'string' && /^(0x)?[0-9a-f]{1,8}$/.test(uuid)) {
        uuid = parseInt(uuid, 16);
    }
    // 16 or 32 bit GUID
    if (typeof uuid === 'number' && uuid > 0) {
        return `${leftPad(uuid.toString(16), 8, '0')}-0000-1000-8000-00805f9b34fb`;
    }
    if (/^{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}?$/.test(uuid)) {
        return uuid.replace('{', '').replace('}', '').toLowerCase();
    }
    throw new Error(`Invalid UUID format: ${origUuid}`);
}

function windowsUuid(uuid) {
    return '{' + normalizeUuid(uuid) + '}';
}

function matchDeviceFilter(filter, device) {
    if (filter.services) {
        const deviceServices = device.serviceUuids.map(normalizeUuid);
        if (!filter.services.map(normalizeUuid).every(uuid => deviceServices.includes(uuid))) {
            return false;
        }
    }
    if (filter.name && filter.name !== device.localName) {
        return false;
    }
    if (filter.namePrefix && device.localName.indexOf(filter.namePrefix) !== 0) {
        return false;
    }
    return true;
}

let scanning = false;
async function requestDevice(port, options) {
    if (!options.filters) {
        // TODO better filters validation, proper error message
        throw new Error('Filters must be provided');
    }

    let deviceFoundCallback = null;
    nativePort.onMessage.addListener(msg => {
        if (msg._type === 'scanResult' && deviceFoundCallback) {
            if (options.acceptAllDevices ||
                options.filters.some(filter => matchDeviceFilter(filter, msg))) {
                nativeRequest('stopScan');
                deviceFoundCallback(msg);
            }
        }
    });
    if (!scanning) {
        await nativeRequest('scan');
    }
    const device = await new Promise(resolve => {
        deviceFoundCallback = resolve;
    });

    return {
        address: device.bluetoothAddress,
        __rssi: device.rssi,
        name: device.localName
    };
}

async function gattConnect(port, address) {
    const gattId = await nativeRequest('connect', { address: address.replace(/:/g, '') });
    portsObjects.get(port).devices.add(gattId);
    return gattId;
}

async function gattDisconnect(port, gattId) {
    portsObjects.get(port).devices.delete(gattId);
    delete characteristicCache[gattId];
    return await nativeRequest('disconnect', { device: gattId });
}

async function getPrimaryService(port, gattId, service) {
    return (await getPrimaryServices(port, gattId, service))[0];
}

async function getPrimaryServices(port, gattId, service) {
    let options = { device: gattId };
    if (service) {
        options.service = windowsUuid(service);
    }
    const services = await nativeRequest('services', options);
    return services.map(normalizeUuid);
}

async function getCharacteristic(port, gattId, service, characteristic) {
    const char = (await getCharacteristics(port, gattId, service, characteristic)).find(x => true);
    if (!char) {
        throw new Error(`Characteristic ${characteristic} not found`);
    }
    return char;
}

async function getCharacteristics(port, gattId, service, characteristic) {
    if (!characteristicCache[gattId]) {
        characteristicCache[gattId] = {};
    }
    if (!characteristicCache[gattId][service]) {
        characteristicCache[gattId][service] = nativeRequest('characteristics', { device: gattId, service: windowsUuid(service) });
    }
    const result = await characteristicCache[gattId][service];
    const characterstics = result.map(c => Object.assign({}, c, {uuid: normalizeUuid(c.uuid)}));
    if (characteristic) {
        return characterstics.filter(c => normalizeUuid(c.uuid) == normalizeUuid(characteristic))
    } else {
        return characterstics;
    }
}

async function readValue(port, gattId, service, characteristic) {
    return await nativeRequest('read', {
        device: gattId,
        service: windowsUuid(service),
        characteristic: windowsUuid(characteristic)
    });
}

async function writeValue(port, gattId, service, characteristic, value) {
    if (!(value instanceof Array) || !value.every(item => typeof item === 'number')) {
        throw new Error('Invalid argument: value');
    }

    return await nativeRequest('write', {
        device: gattId,
        service: windowsUuid(service),
        characteristic: windowsUuid(characteristic),
        value
    });
}

async function startNotifications(port, gattId, service, characteristic) {
    const subscriptionId = await nativeRequest('subscribe', {
        device: gattId,
        service: windowsUuid(service),
        characteristic: windowsUuid(characteristic)
    });

    subscriptions[subscriptionId] = port;
    portsObjects.get(port).subscriptions.add(subscriptionId);
    return subscriptionId;
}

const exportedMethods = {
    requestDevice,
    gattConnect,
    gattDisconnect,
    getPrimaryService,
    getPrimaryServices,
    getCharacteristic,
    getCharacteristics,
    readValue,
    writeValue,
    startNotifications
};

chrome.runtime.onConnect.addListener((port) => {
    portsObjects.set(port, {
        devices: new Set(),
        subscriptions: new Set()
    });

    port.onDisconnect.addListener(() => {
        for (let gattDevice of portsObjects.get(port).devices.values()) {
            gattDisconnect(port, gattDevice);
        }
    });

    port.onMessage.addListener((request) => {
        function sendResponse(response) {
            port.postMessage(Object.assign(response, { id: request.id, origin: request.origin }));
        }
        if (!request.command) {
            sendResponse({ error: 'Missing `command`' });
        }
        if (!(request.args instanceof Array)) {
            sendResponse({ error: '`args` must be an array' });
        }
        const fn = exportedMethods[request.command];
        if (fn) {
            fn(port, ...request.args)
                .then(result => sendResponse({ result }))
                .catch(error => sendResponse({ error: error.toString() }))
            return true;
        } else {
            sendResponse({ error: 'Unknown command: ' + request.command });
        }
    });
});

nativeRequest('ping').then(() => {
    console.log('Connected to server');
});
