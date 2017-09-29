const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');
const { tick } = require('./test-utils');

describe('writeValue', () => {
    it('should write the given value to the characteristic', async () => {
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
            'write': msg => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'write',
                    value: [1, 2, 3, 4]
                }));
            }
        });

        await characteristic.writeValue(new Uint8Array([1, 2, 3, 4]));
    });

    it('should correctly serialize Uint16Array values', async () => {
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

        let written = false;
        background.autoRespond({
            'write': msg => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'write',
                    value: [16, 39, 221, 9]
                }));
                written = true;
                return { result: null };
            }
        });

        await characteristic.writeValue(new Uint16Array([10000, 2525]));
        expect(written).toBe(true);
    });
});
