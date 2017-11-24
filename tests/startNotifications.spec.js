/* eslint-env node, jest */

const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');

describe('startNotifications', () => {
    it('should set up notifications on the device', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }],
        });

        background.simulateDevice(0xffe0, 0xf00f, { notify: true });

        await device.gatt.connect();

        const service = await device.gatt.getPrimaryService(0xffe0);
        const characteristic = await service.getCharacteristic(0xf00f);
        
        let messageReceived = false;
        background.autoRespond({
            'subscribe': msg => {
                messageReceived = true;
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
        expect(messageReceived).toBe(true);
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

        background.simulateDevice(0xffe0, 0xf00f, { notify: true });

        await device.gatt.connect();
        const service = await device.gatt.getPrimaryService(0xffe0);
        const characteristic = await service.getCharacteristic(0xf00f);

        background.autoRespond({
            'subscribe': () => ({ result: 5 }),
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
