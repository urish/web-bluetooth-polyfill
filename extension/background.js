var port = chrome.runtime.connectNative('org.urish.bluetooth.server');

port.onMessage.addListener(function (msg) {
    console.log('Received native message:', msg);
});

port.onDisconnect.addListener(function () {
    console.log("Disconnected!", chrome.runtime.lastError.message);
});

port.postMessage({ "cmd": "helloWorld" });
