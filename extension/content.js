// Connect to background script
let port = chrome.runtime.connect();

port.onMessage.addListener(message => {
    window.postMessage(Object.assign({}, message, {
        type: 'WebBluetoothPolyCSToPage',
    }), message.origin || '*');
})

// Listen for Web Bluetooth Requests
window.addEventListener('message', event => {
    if (event.source === window && event.data && event.data.type === 'WebBluetoothPolyPageToCS') {
        port.postMessage(Object.assign({}, event.data, {origin: event.origin}));
    }
}, false);

// Inject the Polyfill

var script = document.createElement('script');
script.src = chrome.extension.getURL('polyfill.js');
document.documentElement.appendChild(script);

