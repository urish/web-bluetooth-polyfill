const mockEnv = require('./mock-env');
const background = require('../background');
const polyfill = require('../polyfill');

const { nativePort } = mockEnv;

function tick() {
    return new Promise(resolve => setImmediate(resolve));
}

describe('requestDevice', () => {
    it('should scan for devices', async () => {
        mockEnv.connectToBackground();
        navigator.bluetooth.requestDevice({filters: []});
        await tick();
        await tick();
        expect(nativePort.postMessage).toHaveBeenCalledWith({ cmd: 'scan', _id: 1 });
    });
});
