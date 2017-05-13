// Listen for Web Bluetooth Requests
window.addEventListener('message', event => {
    if (event.source === window && event.data && event.data.type === 'WebBluetoothPolyPageToCS') {
        chrome.runtime.sendMessage(event.data, response => {
            window.postMessage(Object.assign(response, {
                type: 'WebBluetoothPolyCSToPage',
                id: event.data.id,
            }), event.origin);
        });
    }
}, false);

chrome.runtime.onMessage.addListener(msg => {
    // TODO propagate origin to background.js
    window.postMessage(Object.assign(msg, {
        type: 'WebBluetoothPolyCSToPage'
    }), '*');
})

// Inject the Polyfill

var script = document.createElement('script');
script.src = chrome.extension.getURL('polyfill.js');
document.documentElement.appendChild(script);

