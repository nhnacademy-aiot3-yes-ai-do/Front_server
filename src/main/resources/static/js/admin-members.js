lucide.createIcons();

var MEMBER_PAGE_SIZE = 8;
var memberState = { sub: 'active', page: 0, totalPages: 1, totalElements: 0, rows: [] };
var memberSearch = '';

function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
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
    memberSearch = '';
    var searchInput = document.getElementById('member-search-input');
    if (searchInput) searchInput.value = '';
    document.getElementById('member-last-col').textContent =
        memberState.sub === 'active' ? '최근 로그인' : '탈퇴 일자';
    loadMembers(0);
}

function handleMemberSearch(value) {
    // 백엔드 목록 API(/admin/members/list)가 검색어 파라미터를 아직 지원하지 않아서,
    // 현재 불러와져 있는 페이지 안에서만 필터링됨(다른 페이지까지 가로질러 검색되진 않음)
    memberSearch = (value || '').trim().toLowerCase();
    renderMemberRows();
}

function goToMemberPage(page) {
    if (page < 0 || page >= memberState.totalPages) return;
    loadMembers(page);
}

// TODO: User_server에 /api/v1/admin/members 가 아직 구현되어 있지 않고(2026-08-26 기준),
// Gateway 라우팅에도 등록되어 있지 않아서 실제 API 호출은 항상 404가 남. 백엔드가 준비될 때까지
// 임시로 목데이터(mockMemberPage)를 대신 보여줌. 백엔드 배포되면 아래 try/catch의 fallback과
// mockMemberPage()/buildMockMembers() 전체를 지우면 됨.
async function loadMembers(page) {
    try {
        var url = '/admin/members/list?status=' + memberState.sub + '&page=' + page + '&size=' + MEMBER_PAGE_SIZE;
        var data;
        try {
            data = await fetchJson(url);
        } catch (apiError) {
            console.warn('[admin-members] 실제 API 응답 실패, 임시 목데이터로 대체합니다:', apiError.message);
            data = mockMemberPage(memberState.sub, page);
        }
        memberState.page = data.number || 0;
        memberState.totalPages = Math.max(1, data.totalPages || 1);
        memberState.totalElements = data.totalElements || 0;
        memberState.rows = data.content || [];
        renderMemberRows();
        renderMemberPagination();
    } catch (e) {
        alert(e.message);
    }
}

var MOCK_NICKNAMES = ['버섯요정', '표고사랑', '느타리언니', '팽이버섯', '균사체', '양송이맘', '송이킹', '목이버섯',
    '새송이짱', '갈색양송이', '버섯농부', '균듬뿍', '차가버섯', '표고아빠', '버섯왕국', '뽕나무버섯',
    '싸리버섯', '노루궁뎅이', '영지버섯', '동충하초', '만가닥', '잎새버섯', '상황버섯', '풀버섯'];

function buildMockMembers(sub, count) {
    var list = [];
    for (var i = 0; i < count; i++) {
        var d = new Date(2026, 0, 1 + i * 5);
        var createdAt = d.toISOString();
        var lastLoginAt = sub === 'active' ? new Date(2026, 7, 20 - (i % 20)).toISOString() : null;
        var deletedAt = sub === 'withdrawn' ? new Date(2026, 7, 10 - (i % 10)).toISOString() : null;
        list.push({
            userId: 1000 + i,
            nickname: MOCK_NICKNAMES[i % MOCK_NICKNAMES.length] + (i >= MOCK_NICKNAMES.length ? (i + 1) : ''),
            email: 'user' + (1000 + i) + '@yesaido.site',
            createdAt: createdAt,
            updatedAt: createdAt,
            lastLoginAt: lastLoginAt,
            deletedAt: deletedAt
        });
    }
    return list;
}

var MOCK_MEMBERS = {
    active: buildMockMembers('active', 18),
    withdrawn: buildMockMembers('withdrawn', 6)
};

function mockMemberPage(sub, page) {
    var all = MOCK_MEMBERS[sub] || [];
    var start = page * MEMBER_PAGE_SIZE;
    return {
        content: all.slice(start, start + MEMBER_PAGE_SIZE),
        totalElements: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / MEMBER_PAGE_SIZE)),
        number: page,
        size: MEMBER_PAGE_SIZE
    };
}

function renderMemberRows() {
    document.getElementById('member-total-count').textContent = memberState.totalElements;

    var rows = memberState.rows;
    if (memberSearch) {
        rows = rows.filter(function (m) {
            return (m.nickname || '').toLowerCase().indexOf(memberSearch) !== -1
                || (m.email || '').toLowerCase().indexOf(memberSearch) !== -1;
        });
    }

    var tbody = document.getElementById('member-tbody');
    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--brown-500);padding:1.6rem;">조건에 맞는 회원이 없어요.</td></tr>';
        return;
    }

    rows.forEach(function (m, idx) {
        var lastValue = memberState.sub === 'active' ? m.lastLoginAt : m.deletedAt;
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td><div class="user-cell"><span class="user-avatar avatar-tone-' + (idx % 8) + '"><i data-lucide="circle-user-round"></i></span><strong>' + m.nickname + '</strong></div></td>' +
            '<td>' + m.email + '</td>' +
            '<td>' + formatDate(m.createdAt) + '</td>' +
            '<td>' + formatDate(lastValue) + '</td>' +
            '<td><div class="row-actions">' +
                '<button type="button" title="수정" onclick="adminComingSoon()"><i data-lucide="pencil"></i></button>' +
                '<button type="button" title="삭제" onclick="adminComingSoon()"><i data-lucide="trash-2"></i></button>' +
            '</div></td>';
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function renderMemberPagination() {
    var wrap = document.getElementById('member-pagination');
    var totalPages = memberState.totalPages;
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }

    var page = memberState.page;
    var prevDisabled = page === 0 ? ' disabled' : '';
    var nextDisabled = page >= totalPages - 1 ? ' disabled' : '';

    var pageBtns = '';
    for (var p = 0; p < totalPages; p++) {
        pageBtns += '<button class="page' + (p === page ? ' active' : '') + '" type="button" onclick="goToMemberPage(' + p + ')">' + (p + 1) + '</button>';
    }

    wrap.innerHTML =
        '<button class="page-arrow' + prevDisabled + '" type="button" onclick="goToMemberPage(' + (page - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        pageBtns +
        '<button class="page-arrow' + nextDisabled + '" type="button" onclick="goToMemberPage(' + (page + 1) + ')"><i data-lucide="chevron-right"></i></button>';

    lucide.createIcons();
}

loadMembers(0);
