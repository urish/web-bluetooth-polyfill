const { BackgroundDriver } = require('./background.driver');
const { PolyfillDriver } = require('./polyfill.driver');
const { tick } = require('./test-utils');

describe('requestDevice', () => {
    it('should scan for devices', async () => {
        const background = new BackgroundDriver();
        const bluetooth = new PolyfillDriver(background).bluetooth;
        bluetooth.requestDevice({ filters: [] });
        expect(background.nativePort.postMessage).toHaveBeenCalledWith({ cmd: 'scan', _id: 1 });
    });

    it('should return devices matching the given filters', async () => {
        const background = new BackgroundDriver();
        const bluetooth = new PolyfillDriver(background).bluetooth;
        const promise = bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });
        background.respond('scan', { result: null });
        await tick();
        background.nativePort.onMessage.dispatch({
            _type: 'scanResult',
            advType: 'ScanResponse',
            bluetoothAddress: 'aa:bb:cc:dd:ee:ff',
            localName: 'test-device',
            rssi: -77,
            serviceUuids: ['{6e400001-b5a3-f393-e0a9-e50e24dcca9e}'],
            timestamp: 24784186015330,
        })

        const device = await promise;
        expect(device.id).toBe('aa:bb:cc:dd:ee:ff');
        expect(device.name).toBe('test-device');
    });
});
