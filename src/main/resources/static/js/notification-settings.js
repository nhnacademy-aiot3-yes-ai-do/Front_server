var NOTIF_CATEGORY_KEY = 'mm_notif_categories';
var NOTIF_CULTIVATION_KEY = 'mm_notif_cultivations';

var DEFAULT_CATEGORY_STATE = {
    sensor: true,
    harvest: true,
    ai: true
};

// 데모 데이터 (구독 API 연동 전. 재배 목록 Feign은 다음 Subscription PR)
var DEMO_CULTIVATIONS = [
    { id: 1, name: 'd' },
    { id: 2, name: 'werfwwe' }
];

var discordEndpoint = null;
var discordModalMode = 'create';

function loadCategoryState() {
    try {
        var saved = JSON.parse(localStorage.getItem(NOTIF_CATEGORY_KEY));
        if (saved && typeof saved === 'object') {
            return Object.assign({}, DEFAULT_CATEGORY_STATE, saved);
        }
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULT_CATEGORY_STATE);
}

function loadCultivationState() {
    try {
        var saved = JSON.parse(localStorage.getItem(NOTIF_CULTIVATION_KEY));
        if (saved && typeof saved === 'object') return saved;
    } catch (e) { /* ignore */ }
    return {};
}

function showSaveStatus() {
    var el = document.getElementById('save-status');
    if (!el) return;
    el.classList.add('show');
    clearTimeout(showSaveStatus._t);
    showSaveStatus._t = setTimeout(function () {
        el.classList.remove('show');
    }, 1400);
}

function handleCategoryToggle(key, checked) {
    var state = loadCategoryState();
    state[key] = checked;
    localStorage.setItem(NOTIF_CATEGORY_KEY, JSON.stringify(state));
    showSaveStatus();
}

function handleCultivationToggle(id, checked) {
    var state = loadCultivationState();
    state[id] = checked;
    localStorage.setItem(NOTIF_CULTIVATION_KEY, JSON.stringify(state));
    showSaveStatus();
}

function renderCultivationList() {
    var listEl = document.getElementById('cultivation-toggle-list');
    if (!listEl) return;

    if (DEMO_CULTIVATIONS.length === 0) {
        listEl.innerHTML = '<p class="settings-empty">참여 중인 재배지가 없어요.</p>';
        return;
    }

    var cultivationState = loadCultivationState();

    listEl.innerHTML = DEMO_CULTIVATIONS.map(function (c) {
        var checked = cultivationState.hasOwnProperty(c.id) ? cultivationState[c.id] : true;
        return (
            '<div class="settings-row">' +
            '<div class="settings-row-icon"><i data-lucide="sprout"></i></div>' +
            '<span class="settings-row-name">' + c.name + '</span>' +
            '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (checked ? 'checked' : '') +
            ' onchange="handleCultivationToggle(' + c.id + ', this.checked)" />' +
            '<span class="toggle-track"><span class="toggle-thumb"></span></span>' +
            '</label>' +
            '</div>'
        );
    }).join('');

    lucide.createIcons();
}

function pickDiscordEndpoint(endpoints) {
    if (!Array.isArray(endpoints)) return null;
    var discords = endpoints.filter(function (item) {
        return item && item.channelCode === 'DISCORD';
    });
    if (discords.length === 0) return null;
    var enabled = discords.find(function (item) { return item.enabled; });
    return enabled || discords[0];
}

function setDiscordStatus(text, connected) {
    var statusEl = document.getElementById('discord-status');
    var btnEl = document.getElementById('discord-action-btn');
    if (!statusEl || !btnEl) return;

    statusEl.textContent = text;
    statusEl.classList.toggle('connected', !!connected);
    btnEl.disabled = false;
    btnEl.textContent = connected ? '연결 해제' : '연결하기';
    btnEl.onclick = connected ? handleDiscordDisconnect : openDiscordModal;
}

function renderDiscordStatus() {
    if (!discordEndpoint) {
        setDiscordStatus('연결 안 됨', false);
        return;
    }
    var name = discordEndpoint.displayName || '디스코드';
    var dest = discordEndpoint.destination ? ' · ' + discordEndpoint.destination : '';
    setDiscordStatus('연결됨 · ' + name + dest, true);
}

function loadDiscordEndpoint() {
    return fetch('/notifications/endpoints', { credentials: 'same-origin' })
        .then(function (response) {
            if (response.redirected && response.url && response.url.indexOf('/login') !== -1) {
                window.location.href = '/login';
                return null;
            }
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return null;
            }
            if (!response.ok) {
                throw new Error('목록을 불러오지 못했습니다.');
            }
            return response.json();
        })
        .then(function (endpoints) {
            if (!endpoints) return;
            discordEndpoint = pickDiscordEndpoint(endpoints);
            renderDiscordStatus();
        })
        .catch(function () {
            discordEndpoint = null;
            setDiscordStatus('연결 상태를 불러오지 못했습니다', false);
            var btnEl = document.getElementById('discord-action-btn');
            if (btnEl) {
                btnEl.textContent = '다시 시도';
                btnEl.onclick = function () { loadDiscordEndpoint(); };
            }
        });
}

function isDiscordWebhookUrl(url) {
    try {
        var parsed = new URL(url);
        var host = (parsed.hostname || '').toLowerCase();
        return parsed.protocol === 'https:'
            && (host === 'discord.com' || host === 'discordapp.com' || host.endsWith('.discord.com'))
            && parsed.pathname.indexOf('/api/webhooks/') === 0
            && !parsed.username;
    } catch (e) {
        return false;
    }
}

function setDiscordFormStatus(message, isError) {
    var statusText = document.getElementById('discord-form-status');
    if (!statusText) return;
    statusText.textContent = message || '';
    statusText.classList.toggle('error', !!isError);
}

function openDiscordModal() {
    discordModalMode = discordEndpoint ? 'update' : 'create';
    document.getElementById('discord-modal-title').textContent =
        discordModalMode === 'update' ? '디스코드 웹후크 수정' : '디스코드 연동하기';
    document.getElementById('discord-display-name').value =
        discordEndpoint && discordEndpoint.displayName ? discordEndpoint.displayName : '디스코드 알림';
    document.getElementById('discord-webhook-url').value = '';
    setDiscordFormStatus('', false);
    document.getElementById('discord-step-connect').style.display = 'block';
    document.getElementById('discord-step-success').style.display = 'none';
    document.getElementById('discord-submit-btn').disabled = false;
    openModal('modal-discord');
    lucide.createIcons();
}

function closeDiscordModal() {
    closeModal('modal-discord');
}

function parseErrorDetail(text) {
    if (!text) return '요청에 실패했습니다.';
    try {
        var body = JSON.parse(text);
        return body.detail || body.message || text;
    } catch (e) {
        return text;
    }
}

function handleDiscordConnect() {
    var displayName = document.getElementById('discord-display-name').value.trim();
    var destination = document.getElementById('discord-webhook-url').value.trim();
    var submitBtn = document.getElementById('discord-submit-btn');

    if (!displayName) {
        setDiscordFormStatus('이름을 입력해주세요.', true);
        return;
    }
    if (!destination) {
        setDiscordFormStatus('Webhook URL을 입력해주세요.', true);
        return;
    }
    if (!isDiscordWebhookUrl(destination)) {
        setDiscordFormStatus('https://discord.com/api/webhooks/ 형식의 URL만 사용할 수 있어요.', true);
        return;
    }

    var method = 'POST';
    var url = '/notifications/endpoints';
    if (discordModalMode === 'update' && discordEndpoint && discordEndpoint.id) {
        method = 'PATCH';
        url = '/notifications/endpoints/' + discordEndpoint.id;
    }

    submitBtn.disabled = true;
    setDiscordFormStatus('연결 중...', false);

    fetch(url, {
        method: method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destination, displayName: displayName })
    })
        .then(function (response) {
            return response.text().then(function (text) {
                return { response: response, text: text };
            });
        })
        .then(function (result) {
            if (result.response.redirected && result.response.url && result.response.url.indexOf('/login') !== -1) {
                window.location.href = '/login';
                return;
            }
            if (!result.response.ok) {
                setDiscordFormStatus(parseErrorDetail(result.text), true);
                submitBtn.disabled = false;
                return;
            }
            if (result.text) {
                try {
                    discordEndpoint = JSON.parse(result.text);
                } catch (e) { /* keep previous */ }
            }
            renderDiscordStatus();
            showSaveStatus();
            document.getElementById('discord-step-connect').style.display = 'none';
            document.getElementById('discord-step-success').style.display = 'block';
            lucide.createIcons();
        })
        .catch(function () {
            setDiscordFormStatus('네트워크 오류로 연결하지 못했습니다.', true);
            submitBtn.disabled = false;
        });
}

function handleDiscordDisconnect() {
    if (!discordEndpoint || !discordEndpoint.id) {
        return;
    }
    if (!window.confirm('디스코드 연결을 해제할까요? 이 경로로 가던 구독도 함께 비활성화됩니다.')) {
        return;
    }

    fetch('/notifications/endpoints/' + discordEndpoint.id, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
        .then(function (response) {
            if (response.redirected && response.url && response.url.indexOf('/login') !== -1) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok && response.status !== 204) {
                throw new Error('disconnect failed');
            }
            discordEndpoint = null;
            renderDiscordStatus();
            showSaveStatus();
        })
        .catch(function () {
            setDiscordStatus('연결 해제에 실패했습니다', true);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    var categoryState = loadCategoryState();
    document.getElementById('toggle-sensor').checked = categoryState.sensor;
    document.getElementById('toggle-harvest').checked = categoryState.harvest;
    document.getElementById('toggle-ai').checked = categoryState.ai;

    loadDiscordEndpoint();
    renderCultivationList();
    lucide.createIcons();
});
