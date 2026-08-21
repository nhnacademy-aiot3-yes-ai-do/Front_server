lucide.createIcons();

function showPanel(name) {
    document.querySelectorAll('.support-panel').forEach(function (p) { p.classList.remove('active'); });
    document.getElementById('support-panel-' + name).classList.add('active');
}

var MY_CULTIVATIONS = [];
var PAGE_SIZE = 6;
var listState = { page: 0, totalPages: 1 };
var currentDetailId = null;

function statusLabel(status) {
    return status === 'RESOLVED' ? '답변완료' : '답변대기';
}

function statusBadgeClass(status) {
    return status === 'RESOLVED' ? 'answered' : 'pending';
}

function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return formatDate(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options));
    var body = await response.json().catch(function () { return null; });
    if (!response.ok || !body || body.success === false) {
        throw new Error((body && body.message) || '요청 처리 중 오류가 발생했어요.');
    }
    return body.data;
}

// ===== 초기 데이터 로드 =====
async function loadCategories() {
    var categories = (await fetchJson('/support/inquiries/categories')) || [];
    var select = document.getElementById('new-category');
    select.innerHTML = categories.map(function (c) {
        return '<option value="' + c.id + '">' + c.categoryName + '</option>';
    }).join('');
}

async function loadMyCultivations() {
    var response = await fetchJson('/support/inquiries/my-cultivations');
    MY_CULTIVATIONS = (response && response.cultivationSummaryResponses) || [];
}

// ===== 목록 =====
async function loadList(page) {
    var grid = document.getElementById('support-grid');
    var emptyEl = document.getElementById('support-empty');
    var pagination = document.getElementById('support-pagination');

    try {
        var data = await fetchJson('/support/inquiries?page=' + page + '&size=' + PAGE_SIZE);
        listState.page = data.number;
        listState.totalPages = Math.max(1, data.totalPages);

        if (!data.content || data.content.length === 0) {
            grid.innerHTML = '';
            emptyEl.style.display = 'block';
            pagination.innerHTML = '';
            return;
        }
        emptyEl.style.display = 'none';

        grid.innerHTML = '';
        data.content.forEach(function (q) {
            var card = document.createElement('a');
            card.className = 'support-card-item';
            card.href = 'javascript:void(0)';
            card.onclick = function () { openDetail(q.id); };
            card.innerHTML =
                '<div class="support-card-top">' +
                '<span class="support-item-category"></span>' +
                '<span class="support-status-badge ' + statusBadgeClass(q.status) + '"></span>' +
                '</div>' +
                '<div class="support-card-title"></div>' +
                '<div class="support-card-foot"><i data-lucide="calendar-days"></i><span></span></div>';
            card.querySelector('.support-item-category').textContent = q.categoryName;
            card.querySelector('.support-status-badge').textContent = statusLabel(q.status);
            card.querySelector('.support-card-title').textContent = q.title;
            card.querySelector('.support-card-foot span').textContent = formatDate(q.createdAt);
            grid.appendChild(card);
        });
        lucide.createIcons();

        pagination.innerHTML = '';
        if (listState.totalPages > 1) {
            pagination.appendChild(buildPageBtn('chevron-left', listState.page > 0, listState.page - 1));
            var label = document.createElement('span');
            label.className = 'support-page-label';
            label.textContent = (listState.page + 1) + ' / ' + listState.totalPages;
            pagination.appendChild(label);
            pagination.appendChild(buildPageBtn('chevron-right', listState.page < listState.totalPages - 1, listState.page + 1));
            lucide.createIcons();
        }
    } catch (e) {
        alert(e.message);
    }
}

function buildPageBtn(icon, enabled, targetPage) {
    var el = document.createElement(enabled ? 'a' : 'span');
    el.className = 'support-page-btn' + (enabled ? '' : ' disabled');
    el.innerHTML = '<i data-lucide="' + icon + '"></i>';
    if (enabled) {
        el.href = 'javascript:void(0)';
        el.onclick = function () { loadList(targetPage); };
    }
    return el;
}

// ===== 작성 =====
function openNewForm() {
    document.getElementById('new-inquiry-form').reset();

    var cultivationSelect = document.getElementById('new-cultivation');
    cultivationSelect.innerHTML = MY_CULTIVATIONS.map(function (c) {
        return '<option value="' + c.cultivationId + '">' + c.name + '</option>';
    }).join('');
    toggleCultivationField();

    lucide.createIcons();
    showPanel('new');
}

function toggleCultivationField() {
    var select = document.getElementById('new-category');
    var selectedOption = select.options[select.selectedIndex];
    var categoryName = selectedOption ? selectedOption.textContent : '';
    var field = document.getElementById('new-cultivation-field');
    var cultivationSelect = document.getElementById('new-cultivation');
    var isCultivation = categoryName === '재배 관련';
    field.style.display = isCultivation ? 'block' : 'none';
    cultivationSelect.required = isCultivation;
}

async function submitNewInquiry(event) {
    event.preventDefault();

    var categoryId = Number(document.getElementById('new-category').value);
    var title = document.getElementById('new-title').value.trim();
    var content = document.getElementById('new-content').value.trim();
    if (!categoryId || !title || !content) return;

    var cultivationId = null;
    if (document.getElementById('new-cultivation-field').style.display !== 'none') {
        cultivationId = Number(document.getElementById('new-cultivation').value) || null;
    }

    try {
        var formData = new FormData();
        formData.append('request', new Blob([JSON.stringify({ categoryId: categoryId, title: title, content: content, cultivationId: cultivationId })], { type: 'application/json' }));

        var detail = await fetch('/support/inquiries', { method: 'POST', body: formData })
            .then(function (res) { return res.json(); })
            .then(function (body) {
                if (!body || body.success === false) throw new Error((body && body.message) || '요청 처리 중 오류가 발생했어요.');
                return body.data;
            });
        await loadList(0);
        openDetail(detail.id);
    } catch (e) {
        alert(e.message);
    }
}

// ===== 상세 =====
async function openDetail(id) {
    currentDetailId = id;
    try {
        var detail = await fetchJson('/support/inquiries/' + id);
        renderDetail(detail);
        showPanel('detail');
    } catch (e) {
        alert(e.message);
    }
}

function renderDetail(inquiry) {
    document.getElementById('detail-category').textContent = inquiry.categoryName;
    var cultivationEl = document.getElementById('detail-cultivation');
    if (inquiry.cultivationName) {
        cultivationEl.textContent = inquiry.cultivationName;
        cultivationEl.style.display = 'inline-flex';
    } else {
        cultivationEl.style.display = 'none';
    }
    document.getElementById('detail-title').textContent = inquiry.title;
    document.getElementById('detail-date').textContent = formatDate(inquiry.createdAt) + ' 작성';

    var statusEl = document.getElementById('detail-status');
    statusEl.textContent = statusLabel(inquiry.status);
    statusEl.className = 'support-status-badge ' + statusBadgeClass(inquiry.status);

    var chat = document.getElementById('support-chat');
    chat.innerHTML = '';
    (inquiry.messages || []).forEach(function (m) {
        appendChatBubble(chat, '나', m.content, formatDateTime(m.createdAt), false);
        if (m.answerContent) {
            appendChatBubble(chat, '관리자', m.answerContent, formatDateTime(m.createdAt), true);
        }
    });
}

function appendChatBubble(chat, name, content, time, fromAdmin) {
    var row = document.createElement('div');
    row.className = 'support-chat-msg ' + (fromAdmin ? 'from-admin' : 'from-user');
    row.innerHTML =
        '<div class="support-chat-avatar">' + (fromAdmin ? '관' : '나') + '</div>' +
        '<div class="support-chat-col">' +
        '<div class="support-chat-name"></div>' +
        '<div class="support-chat-bubble"><span></span></div>' +
        '<div class="support-chat-time"></div>' +
        '</div>';
    row.querySelector('.support-chat-name').textContent = name;
    row.querySelector('.support-chat-bubble span').textContent = content;
    row.querySelector('.support-chat-time').textContent = time;
    chat.appendChild(row);
}

async function submitFollowUp(event) {
    event.preventDefault();
    var input = document.getElementById('followup-input');
    var text = input.value.trim();
    if (!text || currentDetailId == null) return;

    try {
        var detail = await fetchJson('/support/inquiries/' + currentDetailId + '/messages', {
            method: 'POST',
            body: JSON.stringify({ content: text })
        });
        input.value = '';
        renderDetail(detail);
    } catch (e) {
        alert(e.message);
    }
}

// ===== 초기 진입 =====
(async function init() {
    await Promise.all([loadCategories(), loadMyCultivations()]);
    await loadList(0);
})();
