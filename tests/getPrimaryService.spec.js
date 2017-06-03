const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');

describe('getPrimaryService', () => {
    it('should return a service object with `uuid` and `isPrimary` fields', async () => {
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
            'services': (msg) => {
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId', 
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}'
                }));
                return { result: ["{0000ffe0-0000-1000-8000-00805f9b34fb}"] };
            },
        });
        const service = await device.gatt.getPrimaryService(0xffe0);
        expect(service.isPrimary).toEqual(true);
        expect(service.uuid).toEqual('0000ffe0-0000-1000-8000-00805f9b34fb');
    });

    it('should throw an error if the requested services does not exist', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
            'services': () => ({ result: [] }),
        });
        const gatt = await device.gatt.connect();
        const serviceResult = device.gatt.getPrimaryService(0xffe2);
        await expect(serviceResult).rejects.toEqual(new Error('Service 65506 not found'));
    });
});
