/* eslint-env node, jest */

const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');

describe('gatt.connect', () => {
    it('should establish a gatt connection', async () => {
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
        expect(background.lastMessage.address).toBe('112233445566');
    });

    it('should fail if the given device id was not previously returned by `requestDevice`', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }],
        });

        // This is a device we have not been authorized to connect to
        device.id = 'aa:bb:cc:dd:ee:ff';

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
        });
        await expect(device.gatt.connect()).rejects.toBe('Error: Unknown device address');
    });
});
