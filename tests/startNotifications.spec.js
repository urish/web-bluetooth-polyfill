/* eslint-env node, jest */

const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');

describe('startNotification', () => {
    it('should set up notifications on the device', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }],
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
        });
        await device.gatt.connect();

        background.autoRespond({
            'services': () => ({ result: ['{0000ffe0-0000-1000-8000-00805f9b34fb}'] }),
        });
        const service = await device.gatt.getPrimaryService(0xffe0);

        background.autoRespond({
            'characteristics': () => ({
                result: [{
                    uuid: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    properties: {
                        broadcast: false, read: false, writeWithoutResponse: true, write: true,
                        notify: false, indicate: false, authenticatedSignedWrites: false,
                        reliableWrite: false, writableAuxiliaries: false,
                    },
                }],
            }),
        });
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'subscribe': msg => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'subscribe',
                }));
                return {
                    result: 5,
                };
            },
        });

        let value = await characteristic.startNotifications();
        expect(value).toEqual(characteristic);
    });

    it('should fire a `charactersitcvaluechanged` event when a notification is received', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }],
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
        });
        await device.gatt.connect();

        background.autoRespond({
            'services': () => ({ result: ['{0000ffe0-0000-1000-8000-00805f9b34fb}'] }),
        });
        const service = await device.gatt.getPrimaryService(0xffe0);

        background.autoRespond({
            'characteristics': () => ({
                result: [{
                    uuid: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    properties: {
                        broadcast: false, read: false, writeWithoutResponse: true, write: true,
                        notify: false, indicate: false, authenticatedSignedWrites: false,
                        reliableWrite: false, writableAuxiliaries: false,
                    },
                }],
            }),
        });
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'subscribe': msg => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'subscribe',
                }));
                return {
                    result: 5,
                };
            },
        });

        await characteristic.startNotifications();

        let eventFired = false;
        let eventValue;
        characteristic.addEventListener('characteristicvaluechanged', (e) => {
            eventFired = true;
            eventValue = e.target.value;
        });

        background.sendMessage({
            _type: 'valueChangedNotification',
            subscriptionId: 5,
            value: [1, 5, 6, 7],
        });

        expect(eventFired).toBe(true);
        expect(new Uint8Array(eventValue.buffer)).toEqual(new Uint8Array([1, 5, 6, 7]));
    });
});
