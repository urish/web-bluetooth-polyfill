if (!navigator.bluetooth) {
    console.log('Windows 10 Web Bluetooth Polyfill loaded');

    (function () {
        const connectionSymbol = Symbol('connection');

        const outstandingRequests = {};
        const activeSubscriptions = {};
        const connectedDevices = new Set();
        let requestId = 0;
        window.addEventListener('message', event => {
            if (event.source === window && event.data && event.data.type === 'WebBluetoothPolyCSToPage') {
                if (event.data.event === 'disconnectEvent') {
                    const { device } = event.data;
                    Array.from(connectedDevices)
                        .filter(d => d.gatt[connectionSymbol] === device)
                        .forEach(matchingDevice => {
                            matchingDevice.gatt[connectionSymbol] = null;
                            matchingDevice.dispatchEvent({ type: 'gattserverdisconnected' });
                            connectedDevices.delete(matchingDevice);
                        });
                    return;
                }
                if (event.data.subscriptionId) {
                    const subscription = activeSubscriptions[event.data.subscriptionId];
                    if (subscription) {
                        subscription(event.data);
                    }
                    return;
                }
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

        // Implmentation reference: https://developer.mozilla.org/en/docs/Web/API/EventTarget
        const listeners = Symbol('listeners');
		const originalSymbol = Symbol('original');
        class BluetoothEventTarget {
            constructor() {
                this[listeners] = {};
            }

            addEventListener(type, callback) {
				if (typeof Zone !== 'undefined' && Zone.current && Zone.current.wrap) {
					const original = callback;
					callback = Zone.current.wrap(callback);
					callback[originalSymbol] = original;
				}
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
                    if (stack[i] === callback || stack[i][originalSymbol] === callback) {
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

        const subscriptionId = Symbol("subscriptionId");
        const notificationsStarted = Symbol("notificationsStarted");
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
                const result = await callExtension('readValue', [this._connection, this.service.uuid, this.uuid]);
                this.value = new DataView(new Uint8Array(result).buffer);
                return this.value;
            }

            async writeValue(value) {
                const byteValues = Array.from(new Uint8Array(value));
                await callExtension('writeValue', [this._connection, this.service.uuid, this.uuid, byteValues]);
            }

            async startNotifications() {
                if (this[notificationsStarted]) {
                    // already subscribed, do nothing
                    return this;
                }
                this[notificationsStarted] = true;

                try {
                    this[subscriptionId] = await callExtension('startNotifications', [this._connection, this.service.uuid, this.uuid]);
                } catch (err) {
                    this[notificationsStarted] = false;
                    throw err;
                }
                activeSubscriptions[this[subscriptionId]] = (event) => {
                    this.value = new DataView(new Uint8Array(event.value).buffer);
                    this.dispatchEvent({
                        type: 'characteristicvaluechanged',
                        bubbles: true
                    });
                };
                return this;
            }

            async stopNotifications() {
                // TODO implement
                delete activeSubscriptions[this[subscriptionId]];
                this[subscriptionId] = null;
                this[notificationsStarted] = false;
                return this;
            }
        }

        class BluetoothRemoteGATTService extends BluetoothEventTarget {
            constructor(device, uuid, isPrimary) {
                super();
                this.device = device;
                this.uuid = uuid;
                this.isPrimary = isPrimary;
                Object.defineProperty(this, 'device', { enumerable: false });
            }

            async getCharacteristic(characteristic) {
                let { uuid, properties } = await callExtension('getCharacteristic', [this.device.gatt._connection, this.uuid, characteristic]);
                return new BluetoothRemoteGATTCharacteristic(this, uuid, properties);
            }

            async getCharacteristics(characteristic) {
                let result = await callExtension('getCharacteristics', [this.device.gatt._connection, this.uuid, characteristic]);
                return result.map(({ uuid, properties }) => new BluetoothRemoteGATTCharacteristic(this, uuid, properties));
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

        class BluetoothRemoteGATTServer {
            constructor(device) {
                this.device = device;
                this[connectionSymbol] = null;
            }

            async connect() {
                let result = await callExtension('gattConnect', [this.device.id]);
                connectedDevices.add(this.device);
                this[connectionSymbol] = result;
                return this;
            }

            disconnect() {
                callExtension('gattDisconnect', [this._connection]);
                this[connectionSymbol] = null;
                connectedDevices.delete(this.device);
                this.device.dispatchEvent({type: 'gattserverdisconnected'});
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
                if (!uuid) {
                    throw new Error(`Service ${service} not found`);
                }
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