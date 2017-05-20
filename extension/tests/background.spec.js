const mockEnv = require('./mock-env');
const background = require('../background');

const { nativePort } = mockEnv;

describe('background script', () => {
    it('should send a ping message', () => {
        expect(nativePort.postMessage).toHaveBeenCalledWith({ cmd: 'ping', _id: 0 });
    });
});
