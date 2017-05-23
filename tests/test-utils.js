const fs = require('fs');
const vm = require('vm');

class ChromeEventTarget {
    constructor() {
        this.listeners = new Set();
    }

    addListener(fn) {
        this.listeners.add(fn);
    }

    removeListener(fn) {
        this.listeners.delete(fn);
    }

    dispatch(...args) {
        Array.from(this.listeners).forEach(item => item(...args));
    }
}

function loadScript(name) {
    const resolvedName = require.resolve(name);
    return new vm.Script(fs.readFileSync(resolvedName).toString('utf-8'), { filename: resolvedName });
}

function tick() {
    return new Promise(resolve => setImmediate(resolve));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    ChromeEventTarget, loadScript, tick, sleep,
};
