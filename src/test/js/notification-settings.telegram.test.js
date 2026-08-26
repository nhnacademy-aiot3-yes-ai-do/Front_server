const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element() {
    return {
        textContent: '',
        disabled: false,
        onclick: null,
        classList: { add() {}, remove() {}, toggle() {} }
    };
}

const elements = {
    'telegram-status': element(),
    'telegram-action-btn': element(),
    'save-status': element()
};
const requests = [];
const popups = [];
const context = {
    URL,
    Promise,
    Date,
    JSON,
    encodeURIComponent,
    setTimeout,
    clearTimeout,
    fetch(url, options) {
        requests.push({ url, options });
        return new Promise(() => {});
    },
    document: {
        addEventListener() {},
        getElementById(id) { return elements[id] || null; }
    },
    window: {
        clearTimeout,
        setTimeout,
        location: { assign() {}, href: '' },
        open() {
            const popup = { closed: false, opener: 'opener', location: { replace() {} }, close() { this.closed = true; } };
            popups.push(popup);
            return popup;
        }
    }
};
context.globalThis = context;

vm.runInNewContext(
    fs.readFileSync('src/main/resources/static/js/notification-settings.js', 'utf8'),
    context,
    { filename: 'notification-settings.js' }
);

context.handleTelegramConnect();
context.handleTelegramConnect();

assert.equal(popups.length, 1, 'a second click must not open a second Telegram popup');
assert.equal(requests.length, 1, 'a second click must not create a second link session');
assert.equal(elements['telegram-action-btn'].disabled, true, 'the action remains disabled while session creation is in flight');
console.log('notification-settings Telegram single-flight test passed');
