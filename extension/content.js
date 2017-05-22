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
        port.postMessage(Object.assign({}, event.data, { origin: event.origin }));
    }
}, false);

// Device Chooser UI
class DeviceChooserUI {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.zIndex = 99999;
        this.container.style.top = 0;
        this.container.style.left = 0;
        this.container.style.bottom = 0;
        this.container.style.right = 0;
        document.body.appendChild(this.container);

        this.chooserUI = document.createElement('div');
        this.chooserUI.style.width = '380px';
        this.chooserUI.style.background = 'white';
        this.chooserUI.style.margin = '0 auto';
        this.chooserUI.style.border = 'solid #bababa 1px';
        this.chooserUI.style.borderRadius = '2px';
        this.chooserUI.style.padding = '16px';
        this.chooserUI.style.boxShadow = '0 2px 3px rgba(0,0,0,0.4)';
        this.container.appendChild(this.chooserUI);

        this.titleDiv = document.createElement('div');
        this.titleDiv.innerText = `${document.location.hostname} wants to pair`;
        this.chooserUI.appendChild(this.titleDiv);

        this.deviceListDiv = document.createElement('div');
        this.deviceListDiv.style.background = '#f2f1f0';
        this.deviceListDiv.style.height = '320px';
        this.deviceListDiv.style.border = 'solid #9e9e9e 1px';
        this.deviceListDiv.style.margin = '8px 0';
        this.chooserUI.appendChild(this.deviceListDiv);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.justifyContent = 'flex-end';
        this.chooserUI.appendChild(buttonsDiv);
        this.cancelButton = this.createButton(buttonsDiv, 'Cancel');
        this.pairButton = this.createButton(buttonsDiv, 'Pair');
    }

    createButton(container, title) {
        const button = document.createElement('button');
        button.innerText = title;
        button.style.borderRadius = '3px';
        button.style.marginLeft = '8px';
        button.style.border = 'solid #c0c0c0 1px';
        button.style.background = '#edebea';
        button.style.padding = '4px 12px';
        container.appendChild(button);
        return button;
    }
}

// Inject the Polyfill

var script = document.createElement('script');
script.src = chrome.extension.getURL('polyfill.js');
document.documentElement.appendChild(script);

