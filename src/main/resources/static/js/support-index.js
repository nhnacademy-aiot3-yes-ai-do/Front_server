lucide.createIcons();

function showPanel(name) {
    document.querySelectorAll('.support-panel').forEach(function (p) { p.classList.remove('active'); });
    document.getElementById('support-panel-' + name).classList.add('active');
}

var MY_CULTIVATIONS = [];
var PAGE_SIZE = 6;
var listState = { page: 0, totalPages: 1 };
var currentDetailId = null;
var MAX_PHOTOS = 5;
var newInquiryFiles = [];
var followUpFiles = [];

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

async function fetchJsonMultipart(url, formData) {
    var response = await fetch(url, { method: 'POST', body: formData });
    var body = await response.json().catch(function () { return null; });
    if (!response.ok || !body || body.success === false) {
        throw new Error((body && body.message) || '요청 처리 중 오류가 발생했어요.');
    }
    return body.data;
}

// ===== 사진 첨부 공통 로직 =====

function addFilesToState(files, incoming) {
    var accepted = files.slice();
    var rejectedByCount = false;
    for (var i = 0; i < incoming.length; i++) {
        var file = incoming[i];
        if (!file.type || file.type.indexOf('image/') !== 0) continue;
        if (accepted.length >= MAX_PHOTOS) { rejectedByCount = true; break; }
        accepted.push(file);
    }
    if (rejectedByCount) {
        alert('사진은 최대 ' + MAX_PHOTOS + '장까지 첨부할 수 있어요.');
    }
    return accepted;
}

function renderAttachChips(containerId, files, onRemove) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    files.forEach(function (file, index) {
        var chip = document.createElement('div');
        chip.className = 'support-attach-chip';
        var url = URL.createObjectURL(file);
        chip.innerHTML =
            '<img src="' + url + '" alt="" />' +
            '<span class="support-attach-filename"></span>' +
            '<button type="button" class="support-attach-remove" title="첨부 취소">' +
            '<i data-lucide="x"></i></button>';
        chip.querySelector('.support-attach-filename').textContent = file.name;
        chip.querySelector('img').onload = function () { URL.revokeObjectURL(url); };
        chip.querySelector('.support-attach-remove').onclick = function () { onRemove(index); };
        container.appendChild(chip);
    });
    lucide.createIcons();
}

function setupAttachInput(inputId, composerId, getFiles, setFiles, renderFn) {
    var input = document.getElementById(inputId);
    var composer = document.getElementById(composerId);

    input.addEventListener('change', function () {
        setFiles(addFilesToState(getFiles(), input.files));
        input.value = '';
        renderFn();
    });

    composer.addEventListener('dragover', function (e) {
        e.preventDefault();
        composer.classList.add('drag-over');
    });
    composer.addEventListener('dragleave', function () {
        composer.classList.remove('drag-over');
    });
    composer.addEventListener('drop', function (e) {
        e.preventDefault();
        composer.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files) {
            setFiles(addFilesToState(getFiles(), e.dataTransfer.files));
            renderFn();
        }
    });
}

function renderNewInquiryChips() {
    renderAttachChips('new-content-chips', newInquiryFiles, function (index) {
        newInquiryFiles.splice(index, 1);
        renderNewInquiryChips();
    });
}

function renderFollowUpChips() {
    renderAttachChips('followup-chips', followUpFiles, function (index) {
        followUpFiles.splice(index, 1);
        renderFollowUpChips();
    });
}

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

function openNewForm() {
    document.getElementById('new-inquiry-form').reset();
    newInquiryFiles = [];
    renderNewInquiryChips();

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
        newInquiryFiles.forEach(function (file) { formData.append('files', file); });

        var detail = await fetchJsonMultipart('/support/inquiries', formData);
        newInquiryFiles = [];
        await loadList(0);
        openDetail(detail.id);
    } catch (e) {
        alert(e.message);
    }
}

async function openDetail(id) {
    currentDetailId = id;
    followUpFiles = [];
    renderFollowUpChips();
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
        var photoUrls = m.photoUrls || [];
        // 사진은 같은 InquiryAnswer 행에 붙기 때문에, 답변이 달린 메시지는 답변 쪽에,
        // 아직 답변이 없는 메시지는 질문 쪽에 붙여서 보여줍니다.
        appendChatBubble(chat, '나', m.content, formatDateTime(m.createdAt), false, m.answerContent ? [] : photoUrls);
        if (m.answerContent) {
            appendChatBubble(chat, '관리자', m.answerContent, formatDateTime(m.createdAt), true, photoUrls);
        }
    });
}

function appendChatBubble(chat, name, content, time, fromAdmin, photoUrls) {
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
    var bubble = row.querySelector('.support-chat-bubble');
    (photoUrls || []).forEach(function (url) {
        var img = document.createElement('img');
        img.className = 'support-chat-photo';
        img.src = url;
        img.alt = '첨부 사진';
        img.onclick = function () { window.open(url, '_blank'); };
        bubble.insertBefore(img, bubble.firstChild);
    });
    bubble.querySelector('span').textContent = content;
    row.querySelector('.support-chat-time').textContent = time;
    chat.appendChild(row);
}

async function submitFollowUp(event) {
    event.preventDefault();
    var input = document.getElementById('followup-input');
    var text = input.value.trim();
    if (!text || currentDetailId == null) return;

    try {
        var formData = new FormData();
        formData.append('request', new Blob([JSON.stringify({ content: text })], { type: 'application/json' }));
        followUpFiles.forEach(function (file) { formData.append('files', file); });

        var detail = await fetchJsonMultipart('/support/inquiries/' + currentDetailId + '/messages', formData);
        input.value = '';
        followUpFiles = [];
        renderFollowUpChips();
        renderDetail(detail);
    } catch (e) {
        alert(e.message);
    }
}

setupAttachInput('new-photos', 'new-content-composer',
    function () { return newInquiryFiles; },
    function (files) { newInquiryFiles = files; },
    renderNewInquiryChips);

setupAttachInput('followup-photos', 'followup-composer',
    function () { return followUpFiles; },
    function (files) { followUpFiles = files; },
    renderFollowUpChips);

(async function init() {
    await Promise.all([loadCategories(), loadMyCultivations()]);
    await loadList(0);
})();