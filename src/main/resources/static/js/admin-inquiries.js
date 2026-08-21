var INQUIRY_PAGE_SIZE = 8;
var inquiryState = { page: 0, totalPages: 1 };
var currentInquiryId = null;
var currentInquiryDetail = null;

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

function handleInquiryFilterChange() {
    loadInquiries(0);
}

async function loadInquiries(page) {
    var statusValue = document.getElementById('inquiry-status-select').dataset.value;
    var status = statusValue === 'all' ? null : statusValue;

    try {
        var url = '/admin/inquiries/list?page=' + page + '&size=' + INQUIRY_PAGE_SIZE + (status ? '&status=' + status : '');
        var data = await fetchJson(url);
        inquiryState.page = data.number;
        inquiryState.totalPages = Math.max(1, data.totalPages);

        var tbody = document.getElementById('inquiry-tbody');
        tbody.innerHTML = '';
        (data.content || []).forEach(function (q) {
            var tr = document.createElement('tr');
            tr.onclick = function () { openInquiryDetail(q.id); };
            tr.innerHTML = '<td></td><td></td><td></td><td></td><td><span class="status-badge"></span></td>';
            tr.children[0].textContent = q.categoryName;
            tr.children[1].textContent = q.title;
            tr.children[2].textContent = q.userNickname;
            tr.children[3].textContent = formatDate(q.createdAt);
            var badge = tr.querySelector('.status-badge');
            badge.classList.add(statusBadgeClass(q.status));
            badge.textContent = statusLabel(q.status);
            tbody.appendChild(tr);
        });

        renderInquiryPagination();
        lucide.createIcons();
    } catch (e) {
        alert(e.message);
    }
}

function renderInquiryPagination() {
    var wrap = document.getElementById('inquiry-pagination');
    if (inquiryState.totalPages <= 1) { wrap.innerHTML = ''; return; }

    var page = inquiryState.page;
    var totalPages = inquiryState.totalPages;
    var prevDisabled = page === 0 ? ' disabled' : '';
    var nextDisabled = page >= totalPages - 1 ? ' disabled' : '';
    wrap.innerHTML =
        '<button class="admin-page-btn' + prevDisabled + '" type="button" onclick="loadInquiries(' + (page - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        '<span class="admin-page-label">' + (page + 1) + ' / ' + totalPages + '</span>' +
        '<button class="admin-page-btn' + nextDisabled + '" type="button" onclick="loadInquiries(' + (page + 1) + ')"><i data-lucide="chevron-right"></i></button>';
    lucide.createIcons();
}

// ===== 문의 상세 + 답변 작성 =====
async function openInquiryDetail(id) {
    currentInquiryId = id;
    try {
        var detail = await fetchJson('/admin/inquiries/' + id);
        currentInquiryDetail = detail;
        renderInquiryDetail(detail);
        openModal('modal-inquiry-detail');
    } catch (e) {
        alert(e.message);
    }
}

function renderInquiryDetail(inquiry) {
    document.getElementById('iq-category').textContent = inquiry.categoryName;

    var cultivationEl = document.getElementById('iq-cultivation');
    if (inquiry.cultivationName) {
        document.getElementById('iq-cultivation-label').textContent = inquiry.cultivationName;
        cultivationEl.style.display = 'inline-flex';
    } else {
        cultivationEl.style.display = 'none';
    }

    document.getElementById('iq-title').textContent = inquiry.title;
    document.getElementById('iq-date').textContent = formatDate(inquiry.createdAt) + ' 작성 · ' + inquiry.userNickname;

    var statusBadge = document.getElementById('iq-status-badge');
    statusBadge.textContent = statusLabel(inquiry.status);
    statusBadge.className = 'status-badge ' + statusBadgeClass(inquiry.status);

    var chat = document.getElementById('iq-chat');
    chat.innerHTML = '';
    (inquiry.messages || []).forEach(function (m) {
        appendAdminChatBubble(chat, inquiry.userNickname, m.content, formatDateTime(m.createdAt), false);
        if (m.answerContent) {
            appendAdminChatBubble(chat, '관리자', m.answerContent, formatDateTime(m.createdAt), true);
        }
    });
    chat.scrollTop = chat.scrollHeight;

    var composer = document.querySelector('.iq-composer');
    composer.style.display = inquiry.status === 'RESOLVED' ? 'none' : 'flex';

    document.getElementById('iq-reply-input').value = '';
}

function appendAdminChatBubble(chat, name, content, time, isAdmin) {
    var row = document.createElement('div');
    row.className = 'iq-chat-msg' + (isAdmin ? ' from-admin' : '');
    row.innerHTML =
        '<div class="iq-chat-avatar">' + (isAdmin ? '관' : '유') + '</div>' +
        '<div class="iq-chat-col">' +
        '<div class="iq-chat-name"></div>' +
        '<div class="iq-chat-bubble"><span></span></div>' +
        '<div class="iq-chat-time"></div>' +
        '</div>';
    row.querySelector('.iq-chat-name').textContent = name;
    row.querySelector('.iq-chat-bubble span').textContent = content;
    row.querySelector('.iq-chat-time').textContent = time;
    chat.appendChild(row);
}

async function submitAdminReply(event) {
    event.preventDefault();
    var input = document.getElementById('iq-reply-input');
    var text = input.value.trim();
    if (!text || !currentInquiryDetail) return;

    var messages = currentInquiryDetail.messages || [];
    var target = messages[messages.length - 1];
    if (!target || target.answerContent) return;

    try {
        var detail = await fetchJson('/admin/inquiries/messages/' + target.id, {
            method: 'PUT',
            body: JSON.stringify({ content: text })
        });
        currentInquiryDetail = detail;
        renderInquiryDetail(detail);
        loadInquiries(inquiryState.page);
    } catch (e) {
        alert(e.message);
    }
}

loadInquiries(0);
