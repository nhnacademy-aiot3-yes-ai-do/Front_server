lucide.createIcons();

var NOTIFICATION_EVENTS = [
    { id: 1, eventType: 'HARVEST_COMPLETED', name: '수확 완료', description: '재배가 종료되고 수확이 완료되면 발송돼요.' },
    { id: 2, eventType: 'MEMBER_ADDED', name: '담당자 추가', description: '재배지에 새 담당자가 추가되면 발송돼요.' },
    { id: 3, eventType: 'ENVIRONMENT_THRESHOLD_BREACHED', name: '환경 임계값 초과', description: '온도·습도·CO2·조도 등 센서 값이 설정한 임계값을 벗어나면 발송돼요.' }
];
var nextNotificationEventId = 4;
var notificationEventPage = 1;
var NOTIFICATION_EVENT_PAGE_SIZE = 8;
var currentNotificationEventId = null;

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderNotificationEvents() {
    var totalPages = Math.max(1, Math.ceil(NOTIFICATION_EVENTS.length / NOTIFICATION_EVENT_PAGE_SIZE));
    if (notificationEventPage > totalPages) notificationEventPage = totalPages;

    document.getElementById('notification-event-total-count').textContent = NOTIFICATION_EVENTS.length;

    var start = (notificationEventPage - 1) * NOTIFICATION_EVENT_PAGE_SIZE;
    var pageData = NOTIFICATION_EVENTS.slice(start, start + NOTIFICATION_EVENT_PAGE_SIZE);

    var tbody = document.getElementById('notification-event-tbody');
    tbody.innerHTML = '';
    pageData.forEach(function (t) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(t.eventType) + '</td>' +
            '<td>' + escapeHtml(t.name) + '</td>' +
            '<td class="ne-desc-cell" title="' + escapeHtml(t.description) + '">' + escapeHtml(t.description) + '</td>' +
            '<td><div class="row-actions">' +
            '<button type="button" title="수정" onclick="openNotificationEventForm(' + Number(t.id) + ')"><i data-lucide="pencil"></i></button>' +
            '<button type="button" title="삭제" onclick="openDeleteNotificationEvent(' + Number(t.id) + ')"><i data-lucide="trash-2"></i></button>' +
            '</div></td>';
        tbody.appendChild(tr);
    });

    renderNotificationEventPagination(totalPages);
    lucide.createIcons();
}

function goToNotificationEventPage(page) {
    notificationEventPage = page;
    renderNotificationEvents();
}

function renderNotificationEventPagination(totalPages) {
    var wrap = document.getElementById('notification-event-pagination');
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }

    var prevDisabled = notificationEventPage === 1 ? ' disabled' : '';
    var nextDisabled = notificationEventPage === totalPages ? ' disabled' : '';

    var pageBtns = '';
    for (var p = 1; p <= totalPages; p++) {
        pageBtns += '<button class="page' + (p === notificationEventPage ? ' active' : '') + '" type="button" onclick="goToNotificationEventPage(' + p + ')">' + p + '</button>';
    }

    wrap.innerHTML =
        '<button class="page-arrow' + prevDisabled + '" type="button" onclick="goToNotificationEventPage(' + (notificationEventPage - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        pageBtns +
        '<button class="page-arrow' + nextDisabled + '" type="button" onclick="goToNotificationEventPage(' + (notificationEventPage + 1) + ')"><i data-lucide="chevron-right"></i></button>';
    lucide.createIcons();
}

function openNotificationEventForm(id) {
    currentNotificationEventId = id || null;
    document.getElementById('ne-form-error').style.display = 'none';

    var t = id ? NOTIFICATION_EVENTS.filter(function (x) { return x.id === id; })[0] : null;

    document.getElementById('notification-event-form-title').textContent = t ? '알림 이벤트 수정' : '새 이벤트 등록';
    document.getElementById('ne-type').value = t ? t.eventType : '';
    document.getElementById('ne-name').value = t ? t.name : '';
    document.getElementById('ne-description').value = t ? t.description : '';

    openModal('modal-notification-event-form');
}

function saveNotificationEvent(event) {
    event.preventDefault();

    var type = document.getElementById('ne-type').value.trim().toUpperCase();
    var name = document.getElementById('ne-name').value.trim();
    var description = document.getElementById('ne-description').value.trim();

    if (!type || !name) {
        document.getElementById('ne-form-error').style.display = 'block';
        return;
    }

    if (currentNotificationEventId) {
        var target = NOTIFICATION_EVENTS.filter(function (x) { return x.id === currentNotificationEventId; })[0];
        if (target) {
            target.eventType = type;
            target.name = name;
            target.description = description;
        }
    } else {
        NOTIFICATION_EVENTS.push({ id: nextNotificationEventId++, eventType: type, name: name, description: description });
    }

    closeModal('modal-notification-event-form');
    renderNotificationEvents();
}

function openDeleteNotificationEvent(id) {
    currentNotificationEventId = id;
    openModal('modal-notification-event-delete');
}

function deleteNotificationEvent() {
    NOTIFICATION_EVENTS = NOTIFICATION_EVENTS.filter(function (x) { return x.id !== currentNotificationEventId; });
    closeModal('modal-notification-event-delete');
    renderNotificationEvents();
}

renderNotificationEvents();
