lucide.createIcons();

var NOTIFICATION_EVENTS = [];
var notificationEventPage = 1;
var NOTIFICATION_EVENT_PAGE_SIZE = 8;
var currentNotificationEventId = null;
var EVENT_API = '/admin/notification-events/api';

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function targetTypeName(value) {
    return { USER: '사용자', CULTIVATION: '재배', INQUIRY: '문의' }[value] || value || '-';
}

function requestJson(url, options) {
    return fetch(url, Object.assign({
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    }, options || {})).then(function (response) {
        if (!response.ok) {
            return response.text().then(function (body) {
                var message = '요청 처리에 실패했습니다.';
                try { message = JSON.parse(body).message || message; } catch (ignored) { }
                throw new Error(message);
            });
        }
        if (response.status === 204) return null;
        return response.json();
    });
}

function loadNotificationEvents() {
    requestJson(EVENT_API, { headers: {} })
        .then(function (events) {
            NOTIFICATION_EVENTS = Array.isArray(events) ? events : [];
            renderNotificationEvents();
        })
        .catch(function (error) {
            alert(error.message);
            NOTIFICATION_EVENTS = [];
            renderNotificationEvents();
        });
}

function renderNotificationEvents() {
    var totalPages = Math.max(1, Math.ceil(NOTIFICATION_EVENTS.length / NOTIFICATION_EVENT_PAGE_SIZE));
    if (notificationEventPage > totalPages) notificationEventPage = totalPages;
    document.getElementById('notification-event-total-count').textContent = NOTIFICATION_EVENTS.length;

    var start = (notificationEventPage - 1) * NOTIFICATION_EVENT_PAGE_SIZE;
    var pageData = NOTIFICATION_EVENTS.slice(start, start + NOTIFICATION_EVENT_PAGE_SIZE);
    var tbody = document.getElementById('notification-event-tbody');
    tbody.innerHTML = '';
    pageData.forEach(function (event) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(event.code) + '</td>' +
            '<td>' + escapeHtml(event.displayName) + '</td>' +
            '<td>' + escapeHtml(targetTypeName(event.targetType)) + '</td>' +
            '<td class="ne-desc-cell" title="' + escapeHtml(event.description) + '">' + escapeHtml(event.description) + '</td>' +
            '<td><div class="row-actions">' +
            '<button type="button" title="수정" onclick="openNotificationEventForm(' + Number(event.id) + ')"><i data-lucide="pencil"></i></button>' +
            '<button type="button" title="삭제" onclick="openDeleteNotificationEvent(' + Number(event.id) + ')"><i data-lucide="trash-2"></i></button>' +
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
    for (var page = 1; page <= totalPages; page++) {
        pageBtns += '<button class="page' + (page === notificationEventPage ? ' active' : '') + '" type="button" onclick="goToNotificationEventPage(' + page + ')">' + page + '</button>';
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
    var event = id ? NOTIFICATION_EVENTS.filter(function (item) { return item.id === id; })[0] : null;
    document.getElementById('notification-event-form-title').textContent = event ? '알림 이벤트 수정' : '새 이벤트 등록';
    document.getElementById('ne-type').value = event ? event.code : '';
    document.getElementById('ne-name').value = event ? event.displayName : '';
    document.getElementById('ne-description').value = event ? (event.description || '') : '';
    document.getElementById('ne-target-type').value = event ? event.targetType : 'USER';
    openModal('modal-notification-event-form');
}

function saveNotificationEvent(event) {
    event.preventDefault();
    var request = {
        code: document.getElementById('ne-type').value.trim().toUpperCase(),
        displayName: document.getElementById('ne-name').value.trim(),
        description: document.getElementById('ne-description').value.trim(),
        targetType: document.getElementById('ne-target-type').value
    };
    if (!request.code || !request.displayName || !request.targetType) {
        document.getElementById('ne-form-error').style.display = 'block';
        return;
    }
    var url = currentNotificationEventId ? EVENT_API + '/' + currentNotificationEventId : EVENT_API;
    var method = currentNotificationEventId ? 'PUT' : 'POST';
    requestJson(url, { method: method, body: JSON.stringify(request) })
        .then(function () {
            closeModal('modal-notification-event-form');
            loadNotificationEvents();
        })
        .catch(function (error) { alert(error.message); });
}

function openDeleteNotificationEvent(id) {
    currentNotificationEventId = id;
    openModal('modal-notification-event-delete');
}

function deleteNotificationEvent() {
    requestJson(EVENT_API + '/' + currentNotificationEventId, { method: 'DELETE' })
        .then(function () {
            closeModal('modal-notification-event-delete');
            loadNotificationEvents();
        })
        .catch(function (error) { alert(error.message); });
}
function loadNotificationTemplates() {
    requestJson('/admin/notification-events/api/templates').then(function (items) {
        items = Array.isArray(items) ? items : [];
        document.getElementById('notification-template-total-count').textContent = items.length;
        document.getElementById('notification-template-tbody').innerHTML = items.map(function (item) { return '<tr><td>' + escapeHtml(item.eventTypeCode) + '</td><td>' + escapeHtml(item.channelCode) + '</td><td>' + item.version + '</td><td class="ne-desc-cell">' + escapeHtml(item.bodyTemplate) + '</td><td><button type="button" onclick="editNotificationTemplate(' + item.id + ',' + item.eventTypeId + ',' + item.channelTypeId + ',' + item.version + ')">수정</button> <button type="button" onclick="deleteNotificationTemplate(' + item.id + ')">삭제</button></td></tr>'; }).join('');
    }).catch(function (e) { alert(e.message); });
}
function createNotificationTemplate(){var e=prompt('이벤트 ID');var c=prompt('채널 ID');var v=prompt('버전','1');var b=prompt('Template 본문');if(!e||!c||!b)return;requestJson('/admin/notification-events/api/templates',{method:'POST',body:JSON.stringify({eventTypeId:Number(e),channelTypeId:Number(c),version:Number(v||1),bodyTemplate:b.trim()})}).then(loadNotificationTemplates).catch(function(x){alert(x.message);});}
function editNotificationTemplate(id,e,c,v){var body=prompt('Template 본문을 입력하세요.');if(!body||!body.trim())return;requestJson('/admin/notification-events/api/templates/'+id,{method:'PUT',body:JSON.stringify({eventTypeId:e,channelTypeId:c,bodyTemplate:body.trim(),version:v})}).then(loadNotificationTemplates).catch(function(x){alert(x.message);});}
function deleteNotificationTemplate(id){if(!confirm('사용 중인 Template은 삭제할 수 없습니다. 삭제하시겠습니까?'))return;requestJson('/admin/notification-events/api/templates/'+id,{method:'DELETE'}).then(loadNotificationTemplates).catch(function(e){alert(e.message);});}
function loadNotificationChannels(){requestJson('/admin/notification-events/api/channels').then(function(items){items=Array.isArray(items)?items:[];document.getElementById('channel-type-total-count').textContent=items.length;document.getElementById('channel-type-tbody').innerHTML=items.map(function(i){return '<tr><td>'+escapeHtml(i.code)+'</td><td>'+escapeHtml(i.displayName)+'</td><td>'+(i.deleted?'비활성':'활성')+'</td><td><button type="button" onclick="editNotificationChannel('+i.id+',\''+i.code+'\',\''+i.displayName+'\')">수정</button> <button type="button" onclick="toggleNotificationChannel('+i.id+','+i.deleted+')">'+(i.deleted?'복구':'삭제')+'</button></td></tr>';}).join('');}).catch(function(e){alert(e.message);});}
function createNotificationChannel(){var code=prompt('채널 코드');var name=prompt('채널 이름');if(!code||!name)return;requestJson('/admin/notification-events/api/channels',{method:'POST',body:JSON.stringify({code:code.trim().toUpperCase(),displayName:name.trim()})}).then(loadNotificationChannels).catch(function(e){alert(e.message);});}
function editNotificationChannel(id,code,name){var next=prompt('채널 이름',name);if(!next)return;requestJson('/admin/notification-events/api/channels/'+id,{method:'PUT',body:JSON.stringify({code:code,displayName:next.trim()})}).then(loadNotificationChannels).catch(function(e){alert(e.message);});}
function toggleNotificationChannel(id,deleted){var url='/admin/notification-events/api/channels/'+id+(deleted?'/restore':'');requestJson(url,{method:deleted?'POST':'DELETE'}).then(loadNotificationChannels).catch(function(e){alert(e.message);});}
document.querySelectorAll('[data-notification-tab]').forEach(function(tab){tab.addEventListener('click',function(){document.querySelectorAll('[data-notification-tab]').forEach(function(t){t.classList.toggle('active',t===tab);});document.querySelectorAll('[data-notification-panel]').forEach(function(p){p.hidden=p.dataset.notificationPanel!==tab.dataset.notificationTab;});if(tab.dataset.notificationTab==='templates')loadNotificationTemplates();if(tab.dataset.notificationTab==='channels')loadNotificationChannels();});});

loadNotificationEvents();
