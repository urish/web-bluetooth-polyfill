/* eslint-env node, jest */

const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');

describe('stopNotifications', () => {
    it('should stop notifications from the device', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }],
        });

        background.simulateDevice(0xffe0, 0xf00f, { notify: true });

        await device.gatt.connect();

        const service = await device.gatt.getPrimaryService(0xffe0);
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'subscribe': () => ({ result: 12 }),
        });

        await characteristic.startNotifications();

        let messageReceived = false;
        background.autoRespond({
            'unsubscribe': msg => {
                messageReceived = true;
                expect(msg).toEqual(expect.objectContaining({
                    device: 'gattDeviceId',
                    service: '{0000ffe0-0000-1000-8000-00805f9b34fb}',
                    characteristic: '{0000f00f-0000-1000-8000-00805f9b34fb}',
                    cmd: 'unsubscribe',
                }));
                return {
                    result: 12,
                };
            },
        });

        let value = await characteristic.stopNotifications();

        expect(messageReceived).toBe(true);
        expect(value).toEqual(characteristic);
    });
});
