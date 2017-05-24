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
        const stopScanMock = jest.fn().mockReturnValue({ result: null });

        background.autoRespond({
            scan: () => ({ result: null }),
            stopScan: stopScanMock,
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
        expect(stopScanMock).toHaveBeenCalled();
    });

    it('should throw an error if the user cancels the device chooser dialog', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);
        const { bluetooth } = polyfill;
        const stopScanMock = jest.fn().mockReturnValue({ result: null });

        background.autoRespond({
            scan: () => ({ result: null }),
            stopScan: stopScanMock,
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

        polyfill.contentMessage({ cmd: 'chooserCancel' });

        await devicePromise.catch(() => null);

        expect(devicePromise).rejects.toBe('Error: User canceled device chooser');
        expect(stopScanMock).toHaveBeenCalled();
    });

    it('should stop scanning if the page disconnects', async () => {
        const background = new BackgroundDriver();
        const polyfill = new PolyfillDriver(background);
        const { bluetooth } = polyfill;
        const stopScanMock = jest.fn().mockReturnValue({ result: null });

        background.autoRespond({
            scan: () => ({ result: null }),
            stopScan: stopScanMock,
        });

        const devicePromise = bluetooth.requestDevice({
            filters: [{ 'name': 'test-device' }]
        });

        await tick();

        polyfill.disconnect();

        expect(stopScanMock).toHaveBeenCalled();
    });
});
