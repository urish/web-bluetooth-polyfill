const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');
const { tick } = require('./test-utils');

describe('gatt.connect', () => {
    it('should establish a gatt connection', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);
        
        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' })
        });
        const gatt = await device.gatt.connect();
        expect(background.lastMessage.address).toBe('112233445566');
    });
});
