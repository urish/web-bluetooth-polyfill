const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');
const { tick } = require('./test-utils');

describe('readValue', () => {
    it('should read a value from the given characteristic and return it with a promise', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
        });
        const gatt = await device.gatt.connect();

        background.autoRespond({
            'services': msg => ({ result: ['{0000ffe0-0000-1000-8000-00805f9b34fb}'] })
        });
        const service = await device.gatt.getPrimaryService(0xffe0);

        background.autoRespond({
            'characteristics': msg => ({
                result: [{
                    uuid: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    properties: { broadcast: false, read: false, writeWithoutResponse: true, write: true, notify: false, indicate: false, authenticatedSignedWrites: false, reliableWrite: false, writableAuxiliaries: false }
                }]
            })
        });
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'read': msg => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'read'
                }));
                return {
                    result: [1, 5, 5, 7]
                };
            }
        });

        let value = await characteristic.readValue();
        expect(new Uint8Array(value.buffer)).toEqual(new Uint8Array([1, 5, 5, 7]));
    });

    it('should fire a `charactersitcvaluechanged` event once the value has been read', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
        });
        const gatt = await device.gatt.connect();

        background.autoRespond({
            'services': msg => ({ result: ['{0000ffe0-0000-1000-8000-00805f9b34fb}'] })
        });
        const service = await device.gatt.getPrimaryService(0xffe0);

        background.autoRespond({
            'characteristics': msg => ({
                result: [{
                    uuid: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    properties: { broadcast: false, read: false, writeWithoutResponse: true, write: true, notify: false, indicate: false, authenticatedSignedWrites: false, reliableWrite: false, writableAuxiliaries: false }
                }]
            })
        });
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'read': msg => {
                return {
                    result: [6, 5, 4, 3]
                };
            }
        });

        let eventFired = false;
        let newValue;
        characteristic.addEventListener('characteristicvaluechanged', (e) => {
            eventFired = true;
            newValue = e.target.value;
        });

        await characteristic.readValue();
        expect(eventFired).toBe(true);
        expect(new Uint8Array(newValue.buffer)).toEqual(new Uint8Array([6, 5, 4, 3]));
    });
});
