if (!navigator.bluetooth) {
    console.log('Windows 10 Web Bluetooth Polyfill loaded');

    (function () {
        const outstandingRequests = {};
        let requestId = 0;
        window.addEventListener('message', event => {
            if (event.source === window && event.data && event.data.type === 'WebBluetoothPolyCSToPage') {
                const request = outstandingRequests[event.data.id];
                if (request) {
                    if (event.data.error) {
                        request.reject(event.data.error);
                    } else {
                        request.resolve(event.data.result);
                    }
                    delete outstandingRequests[event.data.id];
                }
            }
        }, false);

        function callExtension(command, args) {
            return new Promise((resolve, reject) => {
                outstandingRequests[requestId] = { resolve, reject };
                window.postMessage({
                    type: 'WebBluetoothPolyPageToCS',
                    id: requestId++,
                    command,
                    args,
                }, '*');
            })
        }

        const listeners = Symbol('listeners');
        class BluetoothEventTarget {
            constructor() {
                this[listeners] = {};
            }

            addEventListener(type, callback) {
                if (!(type in this[listeners])) {
                    this[listeners][type] = [];
                }
                this[listeners][type].push(callback);
            }

            removeEventListener(type, callback) {
                if (!(type in this[listeners])) {
                    return;
                }
                var stack = this[listeners][type];
                for (var i = 0, l = stack.length; i < l; i++) {
                    if (stack[i] === callback) {
                        stack.splice(i, 1);
                        return;
                    }
                }
            }

            dispatchEvent(event) {
                if (!(event.type in this[listeners])) {
                    return true;
                }
                var stack = this[listeners][event.type];
                event.target = this;
                for (var i = 0, l = stack.length; i < l; i++) {
                    stack[i].call(this, event);
                }
                return !event.defaultPrevented;
            }
        }

        // Implmentation reference: https://developer.mozilla.org/en/docs/Web/API/EventTarget
        class BluetoothRemoteGATTCharacteristic extends BluetoothEventTarget {
            constructor(service, uuid, properties) {
                super();
                this.service = service;
                this.uuid = uuid;
                this.properties = properties;
                this.value = null;
            }

            get _connection() {
                return this.service.device.gatt._connection;
            }

            async getDescriptor(descriptor) {
                throw new Error('Not implemented');
            }

            async getDescriptors(descriptor) {
                throw new Error('Not implemented');
            }

            async readValue() {
                // TODO implement
                throw new Error('Not implemented');
            }

            async writeValue(value) {
                await callExtension('writeValue', [this._connection, this.service.uuid, this.uuid, Array.from(value)]);
            }

            async startNotifications() {
                // TODO implement
                return this;
            }

            async stopNotifications() {
                // TODO implement
                return this;
            }
        }

        class BluetoothRemoteGATTService extends BluetoothEventTarget {
            constructor(device, uuid, isPrimary) {
                super();
                this.device = device;
                this.uuid = uuid;
                this.isPrimary = isPrimary;
            }

            async getCharacteristic(characteristic) {
                let uuid = await callExtension('getCharacteristic', [this.device.gatt._connection, this.uuid, characteristic]);
                // TODO properties
                return new BluetoothRemoteGATTCharacteristic(this, uuid);
            }

            async getCharacteristics(characteristic) {
                let result = await callExtension('getCharacteristics', [this.device.gatt._connection, this.uuid, characteristic]);
                // TODO properties
                return result.map(uuid => new BluetoothRemoteGATTCharacteristic(this, uuid));
            }

            async getIncludedService(service) {
                // TODO implement
                throw new Error('Not implemented');
            }

            async getIncludedServices(service) {
                // TODO implement
                throw new Error('Not implemented');
            }
        }

        const connectionSymbol = Symbol('connection');
        class BluetoothRemoteGATTServer {
            constructor(device) {
                this.device = device;
                this[connectionSymbol] = null;
            }

            async connect() {
                let result = await callExtension('gattConnect', [this.device.id]);
                this[connectionSymbol] = result;
                // TODO listen for disconnect
                return this;
            }

            disconnect() {
                callExtension('gattDisconnect', [this._connection]);
                this[connectionSymbol] = null;
            }

            get connected() {
                return this[connectionSymbol] !== null;
            }

            get _connection() {
                if (!this.connected) {
                    throw new Error('Invalid state: GATT server not connected');
                }
                return this[connectionSymbol];
            }

            async getPrimaryService(service) {
                let uuid = await callExtension('getPrimaryService', [this._connection, service]);
                return new BluetoothRemoteGATTService(this.device, uuid, true);
            }

            async getPrimaryServices(service) {
                let result = await callExtension('getPrimaryServices', [this._connection, service]);
                return result.map(uuid => new BluetoothRemoteGATTService(this.device, uuid, true));
            }
        }

        class BluetoothDevice extends BluetoothEventTarget {
            constructor(id, name) {
                super();
                this.id = id;
                this.name = name;
                this.gatt = new BluetoothRemoteGATTServer(this);
            }
        }

        navigator.bluetooth = {
            requestDevice: async function (...args) {
                let result = await callExtension('requestDevice', args);
                return new BluetoothDevice(result.address, result.name);
            }
        };
    })();
}