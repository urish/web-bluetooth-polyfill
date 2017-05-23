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
        const polyfill = new PolyfillDriver(background);
        const { bluetooth } = polyfill;

        background.autoRespond({
            scan: () => ({ result: null }),
            stopScan: () => ({ result: null }),
        });

        const devicePromise = bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        await tick();
        background.nativePort.onMessage.dispatch({
            _type: 'scanResult',
            advType: 'ScanResponse',
            bluetoothAddress: 'aa:bb:cc:dd:ee:ff',
            localName: 'test-device',
            rssi: -77,
            serviceUuids: ['{6e400001-b5a3-f393-e0a9-e50e24dcca9e}'],
            timestamp: 24784186015330,
        });

        polyfill.contentMessage({ cmd: 'chooserPair', deviceId: 'aa:bb:cc:dd:ee:ff' });

        const device = await devicePromise;
        expect(device.id).toBe('aa:bb:cc:dd:ee:ff');
        expect(device.name).toBe('test-device');
    });
});
