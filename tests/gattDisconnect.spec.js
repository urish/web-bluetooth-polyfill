const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');
const { tick } = require('./test-utils');

describe('gatt.disconnect', () => {
    it('should fire `ongattserverdisconnected` event', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
            'disconnect': () => ({})
        });
        const gatt = await device.gatt.connect();
        let disconnected = false;
        device.addEventListener('gattserverdisconnected', () => {
            disconnected = true;
        });
        device.gatt.disconnect();
        expect(disconnected).toBe(true);
    });

    it('should support removing the disconnect event listeners inside the disconnect event listener', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);

        background.advertiseDevice('test-device', '11:22:33:44:55:66');
        polyfill.autoChooseDevice('11:22:33:44:55:66');
        const device = await polyfill.bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        background.autoRespond({
            'connect': () => ({ result: 'gattDeviceId' }),
            'disconnect': () => ({})
        });
        const gatt = await device.gatt.connect();

        function listener1() {
            device.removeEventListener('gattserverdisconnected', listener1);    
            device.removeEventListener('gattserverdisconnected', listener2);    
        }

        function listener2() {
        }
        
        device.addEventListener('gattserverdisconnected', listener1);
        device.addEventListener('gattserverdisconnected', listener2);
        device.gatt.disconnect(); 
    });
});
