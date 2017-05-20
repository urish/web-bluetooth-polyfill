const { BackgroundDriver } = require('./background.driver');

describe('background script', () => {
    it('should send a ping message', () => {
        const background = new BackgroundDriver();
        expect(background.nativePort.postMessage).toHaveBeenCalledWith({ cmd: 'ping', _id: 0 });
    });
});
