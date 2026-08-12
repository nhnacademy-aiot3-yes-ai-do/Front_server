var NOTIF_CATEGORY_KEY = 'mm_notif_categories';
var NOTIF_CULTIVATION_KEY = 'mm_notif_cultivations';

var DEFAULT_CATEGORY_STATE = {
    sensor: true,
    harvest: true,
    ai: true
};

// 데모 데이터 (실제로는 /cultivations 목록을 서버에서 받아와야 함)
var DEMO_CULTIVATIONS = [
    { id: 1, name: 'd' },
    { id: 2, name: 'werfwwe' }
];

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

// ===== 텔레그램/디스코드 연동 (프론트 목업: 실제 봇/OAuth 연동 없음) =====
var NOTIF_INTEGRATION_KEY = 'mm_notif_integrations';

var INTEGRATION_LABELS = { telegram: '텔레그램', discord: '디스코드' };
var INTEGRATION_ICONS = { telegram: 'send', discord: 'hash' };

// 실제 봇이 아직 없어서 임시로 넣어둔 링크. 봇 준비되면 이 값만 교체하면 됨.
var INTEGRATION_BOT_LINKS = {
    telegram: 'https://t.me/mushmush_bot',
    discord: 'https://discord.com/invite/mushmush'
};

var currentIntegrationPlatform = null;

function loadIntegrationState() {
    try {
        var saved = JSON.parse(localStorage.getItem(NOTIF_INTEGRATION_KEY));
        if (saved && typeof saved === 'object') return saved;
    } catch (e) { /* ignore */ }
    return { telegram: false, discord: false };
}

function saveIntegrationState(state) {
    localStorage.setItem(NOTIF_INTEGRATION_KEY, JSON.stringify(state));
}

function renderIntegrationStatus() {
    var state = loadIntegrationState();

    ['telegram', 'discord'].forEach(function (platform) {
        var statusEl = document.getElementById(platform + '-status');
        var btnEl = document.getElementById(platform + '-action-btn');
        if (!statusEl || !btnEl) return;

        var connected = !!state[platform];
        statusEl.textContent = connected ? '연결됨' : '연결 안 됨';
        statusEl.classList.toggle('connected', connected);
        btnEl.textContent = connected ? '연결 해제' : '연결하기';

        btnEl.onclick = connected
            ? function () { handleIntegrationDisconnect(platform); }
            : function () { openIntegrationModal(platform); };
    });
}

function openIntegrationModal(platform) {
    currentIntegrationPlatform = platform;

    var iconEl = document.getElementById('integration-modal-icon');
    iconEl.classList.remove('telegram', 'discord');
    iconEl.classList.add(platform);
    iconEl.innerHTML = '<i data-lucide="' + INTEGRATION_ICONS[platform] + '"></i>';

    var linkEl = document.getElementById('integration-bot-link');
    linkEl.classList.remove('telegram', 'discord');
    linkEl.classList.add(platform);
    linkEl.href = INTEGRATION_BOT_LINKS[platform];

    document.getElementById('integration-modal-title').textContent = INTEGRATION_LABELS[platform] + ' 연동하기';
    document.getElementById('integration-bot-link-text').textContent = INTEGRATION_LABELS[platform] + '에서 열기';
    document.getElementById('integration-code').value = '';

    var statusText = document.getElementById('integration-code-status');
    statusText.textContent = '';
    statusText.classList.remove('error');

    document.getElementById('integration-step-connect').style.display = 'block';
    document.getElementById('integration-step-success').style.display = 'none';

    openModal('modal-integration');
    lucide.createIcons();
}

function closeIntegrationModal() {
    closeModal('modal-integration');
    currentIntegrationPlatform = null;
}

function handleIntegrationConfirm() {
    var code = document.getElementById('integration-code').value.trim();
    var statusText = document.getElementById('integration-code-status');

    if (!code) {
        statusText.textContent = '봇이 알려준 인증코드를 입력해주세요.';
        statusText.classList.add('error');
        return;
    }

    // 목업: 백엔드 검증 없이 코드만 입력하면 연결 성공 처리
    var state = loadIntegrationState();
    state[currentIntegrationPlatform] = true;
    saveIntegrationState(state);
    renderIntegrationStatus();

    document.getElementById('integration-success-title').textContent = INTEGRATION_LABELS[currentIntegrationPlatform] + ' 연결 완료';
    document.getElementById('integration-step-connect').style.display = 'none';
    document.getElementById('integration-step-success').style.display = 'block';
}

function handleIntegrationDisconnect(platform) {
    var state = loadIntegrationState();
    state[platform] = false;
    saveIntegrationState(state);
    renderIntegrationStatus();
    showSaveStatus();
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

document.addEventListener('DOMContentLoaded', function () {
    var categoryState = loadCategoryState();
    document.getElementById('toggle-sensor').checked = categoryState.sensor;
    document.getElementById('toggle-harvest').checked = categoryState.harvest;
    document.getElementById('toggle-ai').checked = categoryState.ai;

    renderIntegrationStatus();
    renderCultivationList();
    lucide.createIcons();
});
