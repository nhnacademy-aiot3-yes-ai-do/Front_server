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
    'discord-action-btn': element(),
    'notification-channel-select': element(),
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
        getElementById(id) { return elements[id] || null; },
        querySelectorAll() { return []; }
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
assert.equal(context.pickTelegramEndpoint([{ channelCode: 'TELEGRAM', id: 1, enabled: false }]), null,
    'a disabled Telegram endpoint must not be presented as connected');
context.telegramEndpoint = { channelCode: 'TELEGRAM', id: 1, enabled: true };
context.discordEndpoint = { channelCode: 'DISCORD', id: 2, enabled: true };
elements['notification-channel-select'].value = '2';
assert.equal(context.selectedNotificationEndpoint().id, 2,
    'the selected channel controls which endpoint subscriptions are displayed and changed');
context.pendingGroups = { '1': { harvest: true } };
assert.equal(Object.keys(context.pendingGroupsForSelectedEndpoint()).length, 0,
    'pending selections for Telegram must not appear in Discord settings');
elements['notification-channel-select'].value = '1';
assert.equal(context.pendingGroupsForSelectedEndpoint().harvest, true,
    'a subscription reload or channel change must retain the selected endpoint pending state');
context.setTogglesBusy(true);
assert.equal(elements['notification-channel-select'].disabled, true,
    'the channel selector must be locked while a subscription save is in flight');
assert.equal(elements['discord-action-btn'].disabled, true,
    'disconnect must be locked while a subscription save is in flight');
assert.match(fs.readFileSync('src/main/resources/static/js/notification-settings.js', 'utf8'),
    /loadTelegramEndpoint\(\)\.then\(loadSubscriptionState\)/,
    'a successful Telegram link must reload subscription state before returning control to the UI');
console.log('notification-settings Telegram single-flight test passed');
