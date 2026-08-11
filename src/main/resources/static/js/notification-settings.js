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

    renderCultivationList();
    lucide.createIcons();
});
