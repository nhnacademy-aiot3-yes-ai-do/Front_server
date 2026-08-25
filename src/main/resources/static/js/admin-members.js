lucide.createIcons();

var MEMBER_PAGE_SIZE = 8;
var memberState = { sub: 'active', page: 0, totalPages: 1 };

function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options));
    var body = await response.json().catch(function () { return null; });
    if (!response.ok || !body || body.success === false) {
        throw new Error((body && body.message) || '요청 처리 중 오류가 발생했어요.');
    }
    return body.data;
}

function switchMemberSub(wrapperEl) {
    memberState.sub = wrapperEl.dataset.value;
    document.getElementById('member-last-col').textContent =
        memberState.sub === 'active' ? '마지막 로그인 일자' : '탈퇴 일자';
    loadMembers(0);
}

function goToMemberPage(page) {
    loadMembers(page);
}

async function loadMembers(page) {
    try {
        var url = '/admin/members/list?status=' + memberState.sub + '&page=' + page + '&size=' + MEMBER_PAGE_SIZE;
        var data = await fetchJson(url);
        memberState.page = data.number;
        memberState.totalPages = Math.max(1, data.totalPages);

        var tbody = document.getElementById('member-tbody');
        tbody.innerHTML = '';
        (data.content || []).forEach(function (m) {
            var lastValue = memberState.sub === 'active' ? m.lastLoginAt : m.deletedAt;
            var tr = document.createElement('tr');
            tr.className = 'readonly';
            tr.innerHTML =
                '<td><div class="member-row-name"><span class="member-row-avatar"><i data-lucide="circle-user-round"></i></span>' + m.nickname + '</div></td>' +
                '<td>' + m.email + '</td>' +
                '<td>' + formatDate(m.createdAt) + '</td>' +
                '<td>' + formatDate(m.updatedAt) + '</td>' +
                '<td>' + formatDate(lastValue) + '</td>';
            tbody.appendChild(tr);
        });

        renderMemberPagination();
        lucide.createIcons();
    } catch (e) {
        alert(e.message);
    }
}

function renderMemberPagination() {
    var wrap = document.getElementById('member-pagination');
    if (memberState.totalPages <= 1) { wrap.innerHTML = ''; return; }

    var page = memberState.page;
    var totalPages = memberState.totalPages;
    var prevDisabled = page === 0 ? ' disabled' : '';
    var nextDisabled = page >= totalPages - 1 ? ' disabled' : '';
    wrap.innerHTML =
        '<button class="admin-page-btn' + prevDisabled + '" type="button" onclick="goToMemberPage(' + (page - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        '<span class="admin-page-label">' + (page + 1) + ' / ' + totalPages + '</span>' +
        '<button class="admin-page-btn' + nextDisabled + '" type="button" onclick="goToMemberPage(' + (page + 1) + ')"><i data-lucide="chevron-right"></i></button>';
    lucide.createIcons();
}

loadMembers(0);