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

async function main() {
    const elements = {
        'telegram-status': element(),
        'telegram-action-btn': element(),
        'save-status': element()
    };
    const requests = [];
    const popups = [];
    const timers = [];
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
            if (options && options.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    redirected: false,
                    url: '',
                    text: () => Promise.resolve(JSON.stringify({
                        sessionId: '11111111-1111-1111-1111-111111111111',
                        status: 'PENDING',
                        deepLink: 'https://t.me/example_bot?start=opaque',
                        expiresAt: '2099-01-01T00:00:00Z'
                    }))
                });
            }
            return new Promise(() => {});
        },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; }
        },
        window: {
            clearTimeout() {},
            setTimeout(callback) { timers.push(callback); return timers.length; },
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
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    assert.equal(popups.length, 1);
    assert.equal(requests.length, 2, 'the pending session is polled after the Telegram deep link opens');
    assert.equal(timers.length, 1, 'an opened popup must be watched for user closure');

    popups[0].closed = true;
    timers.shift()();

    assert.equal(context.telegramLinkFlow, null, 'closing the popup ends the local UI flow');
    assert.equal(elements['telegram-action-btn'].disabled, false, 'closing the popup lets the user start again');
    assert.match(elements['telegram-status'].textContent, /창을 닫/, 'popup closure has its own user-facing status');
    assert.equal(requests.length, 2, 'popup closure does not send a cancellation request; the server TTL expires the session');
    console.log('notification-settings Telegram popup-closed test passed');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
