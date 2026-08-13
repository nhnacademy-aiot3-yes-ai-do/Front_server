lucide.createIcons();

var SENSOR_DATA = {
    temp: { '온도센서1': '18°C', '온도센서2': '19°C', '온도센서3': '20°C' },
    humidity: { '습도센서1': '61%', '습도센서2': '58%' },
    co2: { 'CO2센서1': '480ppm', 'CO2센서2': '530ppm' },
    light: { '조도센서1': '350lux', '조도센서2': '410lux' }
};

function updateSensor(wrapperEl, optionEl, type) {
    var valueEl = wrapperEl.closest('.sensor-main').querySelector('.sensor-value');
    valueEl.textContent = SENSOR_DATA[type][wrapperEl.dataset.value];
}

// 커스텀 드롭다운(.msh-select) 관련 공통 로직은 /js/msh-select.js로 옮겼음 (관리자 페이지랑 같이 씀).

var CHATBOT_REPLIES = [
    '음... 조금 더 지켜봐야 할 것 같아요 🍄',
    '좋은 질문이네요! 조만간 더 자세히 알려드릴게요.',
    '현재 재배 환경은 전반적으로 안정적이에요.',
    '알겠어요, 계속 모니터링해서 알려드릴게요!'
];

function sendChatMessage(event) {
    event.preventDefault();
    var input = document.getElementById('chatbot-input');
    var text = input.value.trim();
    if (!text) return;

    var list = document.getElementById('chatbot-messages');

    var userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.innerHTML = '<div class="chat-bubble"></div>';
    userMsg.querySelector('.chat-bubble').textContent = text;
    list.appendChild(userMsg);

    input.value = '';
    list.scrollTop = list.scrollHeight;

    window.setTimeout(function () {
        var reply = CHATBOT_REPLIES[Math.floor(Math.random() * CHATBOT_REPLIES.length)];
        var botMsg = document.createElement('div');
        botMsg.className = 'chat-message bot';
        botMsg.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble"></div>';
        botMsg.querySelector('.chat-bubble').textContent = reply;
        list.appendChild(botMsg);
        list.scrollTop = list.scrollHeight;
    }, 500);
}

function updateSettingsSensorIcon(wrapperEl, optionEl) {
    var iconName = optionEl.dataset.icon;
    var wrap = document.getElementById('settings-sensor-icon-wrap');
    wrap.innerHTML = '<i data-lucide="' + iconName + '" style="width:20px;height:20px;"></i>';
    lucide.createIcons();
}

function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
        panel.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

function togglePanel(id) {
    var panel = document.getElementById(id);
    var isOpen = panel.classList.contains('is-open');
    document.querySelectorAll('.dropdown-panel').forEach(function (p) {
        p.classList.remove('is-open');
    });
    if (!isOpen) {
        panel.classList.add('is-open');
        if (id === 'notif-panel') {
            notifState.page = 0;
            renderNotifPanel();
        }
        if (id === 'member-panel') {
            memberState.page = 0;
            renderMemberPanel();
        }
    }
}

// 알림 목록 (데모 데이터, 실제로는 서버에서 받아와야 함)
var notifData = [
    '알림 1', '알림 2', '알림 3', '알림 4', '알림 5',
    '알림 6', '알림 7', '알림 8', '알림 9', '알림 10',
    '알림 11', '알림 12'
];
var NOTIF_PAGE_SIZE = 5;
var notifState = { page: 0 };

function renderNotifPanel() {
    var totalPages = Math.max(1, Math.ceil(notifData.length / NOTIF_PAGE_SIZE));
    notifState.page = Math.max(0, Math.min(notifState.page, totalPages - 1));

    var list = document.getElementById('notif-list');
    list.innerHTML = '';
    var start = notifState.page * NOTIF_PAGE_SIZE;
    notifData.slice(start, start + NOTIF_PAGE_SIZE).forEach(function (text) {
        var row = document.createElement('div');
        row.className = 'notif-row';
        row.textContent = text;
        list.appendChild(row);
    });

    document.getElementById('notif-page-label').textContent =
        (notifState.page + 1) + ' / ' + totalPages;

    var pagination = document.getElementById('notif-pagination');
    pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
    document.getElementById('notif-prev').disabled = notifState.page === 0;
    document.getElementById('notif-next').disabled = notifState.page >= totalPages - 1;
}

function changeNotifPage(delta) {
    var totalPages = Math.max(1, Math.ceil(notifData.length / NOTIF_PAGE_SIZE));
    notifState.page = Math.max(0, Math.min(totalPages - 1, notifState.page + delta));
    renderNotifPanel();
}

var MEMBER_PAGE_SIZE = 4;
var memberState = { page: 0 };

function roleLabel(role) {
    if (role === 'OWNER') return '소유자';
    if (role === 'MANAGER') return '매니저';
    return '멤버';
}

function refreshMembers() {
    fetch('/cultivations/' + CULTIVATION_ID + '/members')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            memberData = data;
            renderMemberPanel();
        });
}

function renderMemberRow(m) {
    var row = document.createElement('div');
    row.className = 'member-row';

    var actionBtns = '';
    if (MY_ROLE === 'OWNER' && m.role !== 'OWNER') {
        if (m.role === 'MEMBER') {
            actionBtns +=
                '<button class="member-role-toggle" type="button" title="매니저로 승격" onclick="changeMemberRole(' + m.userId + ', \'MANAGER\')">' +
                '<i data-lucide="shield-check" style="width:18px;height:18px;"></i></button>';
        } else if (m.role === 'MANAGER') {
            actionBtns +=
                '<button class="member-role-toggle" type="button" title="멤버로 강등" onclick="changeMemberRole(' + m.userId + ', \'MEMBER\')">' +
                '<i data-lucide="shield-alert" style="width:18px;height:18px;"></i></button>';
        }
        actionBtns +=
            '<button class="member-transfer" type="button" title="방장 위임" onclick="transferOwnership(' + m.userId + ')">' +
            '<i data-lucide="crown" style="width:18px;height:18px;"></i></button>' +
            '<button class="member-remove" type="button" title="제거" onclick="removeMember(' + m.userId + ')">' +
            '<i data-lucide="user-minus" style="width:18px;height:18px;"></i></button>';
    }

    row.innerHTML =
        '<div class="member-avatar"><i data-lucide="circle-user-round" style="width:20px;height:20px;"></i></div>' +
        '<div class="member-info">' +
        '<span class="member-name"></span>' +
        '<span class="member-role"></span>' +
        '</div>' + actionBtns;
    row.querySelector('.member-name').textContent = m.nickname;
    row.querySelector('.member-role').textContent = roleLabel(m.role);
    return row;
}

function renderMemberPanel() {
    var totalPages = Math.max(1, Math.ceil(memberData.length / MEMBER_PAGE_SIZE));
    memberState.page = Math.max(0, Math.min(memberState.page, totalPages - 1));

    var list = document.getElementById('member-list');
    list.innerHTML = '';
    var start = memberState.page * MEMBER_PAGE_SIZE;
    memberData.slice(start, start + MEMBER_PAGE_SIZE).forEach(function (m) {
        list.appendChild(renderMemberRow(m));
    });
    lucide.createIcons();

    document.getElementById('member-page-label').textContent =
        (memberState.page + 1) + ' / ' + totalPages;

    var pagination = document.getElementById('member-pagination');
    pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
    document.getElementById('member-prev').disabled = memberState.page === 0;
    document.getElementById('member-next').disabled = memberState.page >= totalPages - 1;
}

function changeMemberPage(delta) {
    var totalPages = Math.max(1, Math.ceil(memberData.length / MEMBER_PAGE_SIZE));
    memberState.page = Math.max(0, Math.min(totalPages - 1, memberState.page + delta));
    renderMemberPanel();
}

function removeMember(userId) {
    fetch('/cultivations/' + CULTIVATION_ID + '/members/' + userId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('remove failed');
            refreshMembers();
        })
        .catch(function () { alert('담당자 제거에 실패했습니다.'); });
}

function openMemberAddModal() {
    document.getElementById('member-search-input').value = '';
    document.getElementById('member-search-results').innerHTML =
        '<div class="member-search-hint">이메일 전체 또는 닉네임 일부를 입력해서 검색해 보세요.</div>';
    openModal('modal-member-add');
}

function searchMemberCandidates() {
    var query = document.getElementById('member-search-input').value.trim();
    var resultsEl = document.getElementById('member-search-results');

    if (!query) {
        resultsEl.innerHTML = '<div class="member-search-hint">이메일 전체 또는 닉네임 일부를 입력해서 검색해 보세요.</div>';
        return;
    }

    fetch('/cultivations/' + CULTIVATION_ID + '/members/search?keyword=' + encodeURIComponent(query))
        .then(function (res) { return res.json(); })
        .then(function (matches) {
            var existingUserIds = memberData.map(function (m) { return m.userId; });
            matches = matches.filter(function (u) { return existingUserIds.indexOf(u.userId) === -1; });

            if (matches.length === 0) {
                resultsEl.innerHTML = '<div class="member-search-hint">검색 결과가 없습니다.</div>';
                return;
            }

            resultsEl.innerHTML = '';
            matches.forEach(function (u) {
                var row = document.createElement('div');
                row.className = 'member-search-row';
                row.innerHTML =
                    '<div class="member-avatar"><i data-lucide="circle-user-round" style="width:20px;height:20px;"></i></div>' +
                    '<div class="member-search-info">' +
                    '<span class="member-name"></span>' +
                    '<span class="member-email"></span>' +
                    '</div>' +
                    '<button class="member-search-add" type="button">추가</button>';
                row.querySelector('.member-name').textContent = u.nickname;
                row.querySelector('.member-search-add').onclick = function () { addMember(u); };
                resultsEl.appendChild(row);
            });
            lucide.createIcons();
        });
}

function addMember(u) {
    fetch('/cultivations/' + CULTIVATION_ID + '/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.userId })
    })
        .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            refreshMembers();
            searchMemberCandidates();
        })
        .catch(function () { alert('담당자 추가에 실패했습니다.'); });
}

function transferOwnership(userId) {
    if (!confirm('이 멤버에게 방장을 위임하시겠어요?')) return;
    fetch('/cultivations/' + CULTIVATION_ID + '/owner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
    })
        .then(function (res) {
            if (!res.ok) throw new Error('transfer failed');
            refreshMembers();
        })
        .catch(function () { alert('방장 위임에 실패했습니다.'); });
}

function changeMemberRole(userId, newRole) {
    var label = newRole === 'MANAGER' ? '매니저로 승격' : '멤버로 강등';
    if (!confirm('이 멤버를 ' + label + '하시겠어요?')) return;
    fetch('/cultivations/' + CULTIVATION_ID + '/members/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
    })
        .then(function (res) {
            if (!res.ok) throw new Error('role update failed');
            refreshMembers();
        })
        .catch(function () { alert('역할 변경에 실패했습니다.'); });
}

// ===== AI report 탭: 일자별 리포트 =====
var DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
var REPORT_AVAILABLE_DAYS = 14; // 오늘 포함 최근 14일치만 리포트 제공 (데모)

function toDateKey(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function startOfDay(date) {
    var result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

// 일요일부터 시작하는 주의 첫 날짜를 반환 (일월화수목금토 순서 고정)
function startOfWeek(date) {
    return addDays(startOfDay(date), -date.getDay());
}

var reportToday = startOfDay(new Date());
var reportOldestAvailable = addDays(reportToday, -(REPORT_AVAILABLE_DAYS - 1));
var reportState = {
    selectedDate: toDateKey(reportToday),
    stripStart: startOfWeek(reportToday)
};

function hashSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
}

function generateReportData(dateKey) {
    var seed = hashSeed(dateKey);

    var temp = 17 + (seed % 6);
    var humidity = 52 + ((seed >> 3) % 18);
    var co2 = 440 + ((seed >> 6) % 140);
    var light = 300 + ((seed >> 9) % 160);
    var pestSafe = ((seed >> 12) % 10) !== 0;

    var points = [];
    for (var i = 0; i < 9; i++) {
        points.push(20 + ((seed >> (i * 3)) % 70));
    }

    var tempComment = temp <= 21 ? '재배에 적합한 온도' : '평소보다 다소 높은 온도';
    var humidComment = (humidity >= 55 && humidity <= 65) ? '적정 습도 범위' : '습도 관리가 필요한 범위';

    var summary =
        '이 날 평균 온도는 ' + temp + '°C, 습도는 ' + humidity + '%로 ' + tempComment + '였고, ' + humidComment + '였어요. ' +
        'CO2 농도는 ' + co2 + 'ppm, 조도는 ' + light + 'lux를 기록했습니다. ' +
        (pestSafe ? '병충해 징후는 발견되지 않아 안전한 하루였습니다.' : '병충해 징후가 일부 감지되어 관찰이 필요해요.');

    return { temp: temp, humidity: humidity, co2: co2, light: light, pestSafe: pestSafe, points: points, summary: summary };
}

function renderReportChart(points) {
    var xs = [0, 32, 65, 98, 130, 163, 195, 228, 260];
    var linePoints = xs.map(function (x, i) { return x + ',' + points[i]; }).join(' ');
    var polygonPoints = linePoints + ' 260,110 0,110';
    var last = xs.length - 1;

    var svg = document.getElementById('report-chart-svg');
    svg.innerHTML =
        '<defs><linearGradient id="reportChartFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="var(--sage-500)" stop-opacity="0.35" />' +
        '<stop offset="100%" stop-color="var(--sage-500)" stop-opacity="0" /></linearGradient></defs>' +
        '<polyline class="chart-grid-line" points="0,20 260,20" />' +
        '<polyline class="chart-grid-line" points="0,55 260,55" />' +
        '<polyline class="chart-grid-line" points="0,90 260,90" />' +
        '<polygon fill="url(#reportChartFill)" points="' + polygonPoints + '" />' +
        '<polyline class="chart-demo-line" fill="none" points="' + linePoints + '" />' +
        '<circle class="chart-demo-dot" cx="' + xs[last] + '" cy="' + points[last] + '" r="4.5" />';
}

function renderReportBody(dateKey) {
    var data = generateReportData(dateKey);
    var parts = dateKey.split('-');
    var labelDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    document.getElementById('report-selected-date-label').textContent =
        labelDate.getFullYear() + '년 ' + (labelDate.getMonth() + 1) + '월 ' + labelDate.getDate() + '일 (' + DOW_LABELS[labelDate.getDay()] + ')';
    document.getElementById('report-summary-text').textContent = data.summary;

    var statGrid = document.getElementById('report-env-stat-grid');
    statGrid.innerHTML =
        '<div class="env-stat-item"><i data-lucide="thermometer" class="env-stat-icon"></i><span class="env-stat-label">평균 온도</span><span class="env-stat-value">' + data.temp + '°C</span></div>' +
        '<div class="env-stat-item"><i data-lucide="droplet" class="env-stat-icon"></i><span class="env-stat-label">평균 습도</span><span class="env-stat-value">' + data.humidity + '%</span></div>' +
        '<div class="env-stat-item"><i data-lucide="cloudy" class="env-stat-icon"></i><span class="env-stat-label">평균 CO2</span><span class="env-stat-value">' + data.co2 + 'ppm</span></div>' +
        '<div class="env-stat-item"><i data-lucide="sun" class="env-stat-icon"></i><span class="env-stat-label">평균 조도</span><span class="env-stat-value">' + data.light + 'lux</span></div>';

    renderReportChart(data.points);
    lucide.createIcons();
}

function renderReportDateStrip() {
    var strip = document.getElementById('report-date-strip');
    strip.innerHTML = '';

    for (var i = 0; i < 7; i++) {
        var date = addDays(reportState.stripStart, i);
        if (date > reportToday) continue; // 내일 이후는 아예 표시하지 않음

        var dateKey = toDateKey(date);
        var isToday = dateKey === toDateKey(reportToday);
        var disabled = date < reportOldestAvailable;

        var chip = document.createElement('div');
        chip.className = 'report-date-chip' +
            (dateKey === reportState.selectedDate ? ' active' : '') +
            (disabled ? ' disabled' : '') +
            (isToday ? ' today' : '');
        chip.innerHTML =
            '<span class="chip-dow">' + DOW_LABELS[date.getDay()] + '</span>' +
            '<span class="chip-day">' + (isToday ? '오늘' : date.getDate()) + '</span>';

        if (!disabled) {
            chip.onclick = (function (key) {
                return function () { selectReportDate(key); };
            })(dateKey);
        }
        strip.appendChild(chip);
    }
}

function selectReportDate(dateKey) {
    reportState.selectedDate = dateKey;
    renderReportDateStrip();
    renderReportBody(dateKey);
}

function shiftReportWeek(delta) {
    var next = addDays(reportState.stripStart, delta * 7);
    var currentWeekStart = startOfWeek(reportToday);
    if (next > currentWeekStart) next = currentWeekStart; // 오늘이 포함된 주 이후로는 넘어가지 않음
    reportState.stripStart = next;
    renderReportDateStrip();
}

renderReportDateStrip();
renderReportBody(reportState.selectedDate);

// 재배량 (재배 종료 시 한 번만 입력, 실제로는 서버에서 받아와야 함)
var harvestState = { totalAmount: 0 };

// ===== 재배 종료 흐름: 최종 재배량 -> AI 재배 리포트 -> 재배 이력 비교 -> 홈 =====
var CULTIVATION_START_DATE_KEY = toDateKey(addDays(reportToday, -21)); // 데모: 21일 전 시작

// 이전에 재배했던 이력 목록 (데모 데이터, 실제로는 서버에서 사용자의 재배 이력을 받아와야 함)
var PAST_CULTIVATION_CYCLES = [
    { id: 1, name: 'Cultivation1', type: '느타리버섯', period: '2027.01 ~ 2027.02', amount: 340, days: 24 },
    { id: 2, name: 'Cultivation2', type: '양송이버섯', period: '2027.03 ~ 2027.04', amount: 410, days: 26 },
    { id: 3, name: 'Cultivation3', type: '표고버섯', period: '2027.05 ~ 2027.06', amount: 295, days: 22 }
];
var endReportStats = null;

function populateCompareSelect() {
    var wrapperEl = document.getElementById('end-compare-select');
    var menu = wrapperEl.querySelector('.msh-select-menu');
    menu.innerHTML = PAST_CULTIVATION_CYCLES.map(function (c, i) {
        return '<div class="msh-select-option' + (i === 0 ? ' selected' : '') + '" data-value="' + c.id + '" onclick="selectMshOption(this)">' +
            c.name + ' · ' + c.type + ' (' + c.period + ')</div>';
    }).join('');

    var first = PAST_CULTIVATION_CYCLES[0];
    if (first) {
        wrapperEl.dataset.value = first.id;
        wrapperEl.querySelector('.msh-select-value').textContent = first.name + ' · ' + first.type + ' (' + first.period + ')';
    }
}
populateCompareSelect();

function handleCompareSelectChange() {
    renderEndCompare(endReportStats);
}

function openEndAmountModal() {
    document.getElementById('end-amount-input').value = '0';
    document.getElementById('end-memo-input').value = '';
    openModal('modal-end-amount');
}

function submitEndAmount() {
    var amountInput = document.getElementById('end-amount-input');
    var memoInput = document.getElementById('end-memo-input');
    var amount = Number(amountInput.value);

    if (amountInput.value === '' || isNaN(amount) || amount < 0) {
        amountInput.focus();
        return;
    }

    var memo = memoInput.value;

    fetch('/cultivations/' + CULTIVATION_ID + '/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ harvestWeight: amount, memo: memo })
    })
        .then(function (res) {
            if (!res.ok) throw new Error('harvest failed');
            return res.json();
        })
        .then(function () {
            harvestState.totalAmount = amount;

            endReportStats = computeEndReportStats();
            renderEndReport(endReportStats);

            amountInput.value = '';
            memoInput.value = '';

            closeModal('modal-end-amount');
            openModal('modal-end-report');
        })
        .catch(function () { alert('수확 기록에 실패했습니다.'); });
}

function computeEndReportStats() {
    var parts = CULTIVATION_START_DATE_KEY.split('-');
    var start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var totalDays = Math.round((reportToday - start) / (1000 * 60 * 60 * 24)) + 1;

    var tempSum = 0, humiditySum = 0, pestDays = 0, dayCount = 0;
    for (var d = new Date(start); d <= reportToday; d = addDays(d, 1)) {
        var data = generateReportData(toDateKey(d));
        tempSum += data.temp;
        humiditySum += data.humidity;
        if (!data.pestSafe) pestDays++;
        dayCount++;
    }

    return {
        totalDays: totalDays,
        totalAmount: harvestState.totalAmount,
        avgTemp: Math.round(tempSum / dayCount),
        avgHumidity: Math.round(humiditySum / dayCount),
        pestDays: pestDays
    };
}

function renderEndReport(stats) {
    var grid = document.getElementById('end-report-stat-grid');
    grid.innerHTML =
        '<div class="env-stat-item"><i data-lucide="calendar-days" class="env-stat-icon"></i><span class="env-stat-label">총 재배기간</span><span class="env-stat-value">' + stats.totalDays + '일</span></div>' +
        '<div class="env-stat-item"><i data-lucide="package" class="env-stat-icon"></i><span class="env-stat-label">총 재배량</span><span class="env-stat-value">' + stats.totalAmount + 'g</span></div>' +
        '<div class="env-stat-item"><i data-lucide="thermometer" class="env-stat-icon"></i><span class="env-stat-label">평균 온도</span><span class="env-stat-value">' + stats.avgTemp + '°C</span></div>' +
        '<div class="env-stat-item"><i data-lucide="droplet" class="env-stat-icon"></i><span class="env-stat-label">평균 습도</span><span class="env-stat-value">' + stats.avgHumidity + '%</span></div>' +
        '<div class="env-stat-item"><i data-lucide="shield-alert" class="env-stat-icon"></i><span class="env-stat-label">병충해 감지일</span><span class="env-stat-value">' + stats.pestDays + '일</span></div>';

    document.getElementById('end-report-summary').textContent =
        '총 ' + stats.totalDays + '일 동안 재배해서 총 ' + stats.totalAmount + 'g을 수확했어요. ' +
        '평균 온도 ' + stats.avgTemp + '°C, 평균 습도 ' + stats.avgHumidity + '%로 재배 환경은 대체로 안정적이었어요. ' +
        (stats.pestDays === 0 ? '병충해 없이 재배를 마쳤습니다.' : '병충해 징후가 ' + stats.pestDays + '일 감지되었으니 다음 재배 시 참고해 주세요.');

    lucide.createIcons();
}

function goToEndCompare() {
    renderEndCompare(endReportStats);
    closeModal('modal-end-report');
    openModal('modal-end-compare');
}

function buildCompareRow(label, currentValue, targetValue, unit) {
    var diff = currentValue - targetValue;
    var diffClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'flat');
    var diffText = diff === 0 ? '선택한 재배와 동일' :
        (diff > 0 ? '▲ +' + diff + unit + ' 더 많음' : '▼ ' + diff + unit + ' 더 적음');

    return '<div class="compare-row">' +
        '<span class="compare-label">' + label + '</span>' +
        '<span class="compare-current">' + currentValue + unit + '</span>' +
        '<span class="compare-avg">선택한 재배 ' + targetValue + unit + '</span>' +
        '<span class="compare-diff ' + diffClass + '">' + diffText + '</span>' +
        '</div>';
}

function renderEndCompare(stats) {
    var selectedId = Number(document.getElementById('end-compare-select').dataset.value);
    var target = PAST_CULTIVATION_CYCLES.filter(function (c) { return c.id === selectedId; })[0]
        || PAST_CULTIVATION_CYCLES[0];

    document.getElementById('end-compare-rows').innerHTML =
        buildCompareRow('총 재배량', stats.totalAmount, target.amount, 'g') +
        buildCompareRow('재배 기간', stats.totalDays, target.days, '일');
}

function finishCultivation() {
    closeModal('modal-end-compare');
    location.href = '/';
}

function deleteCultivation() {
    fetch('/cultivations/' + CULTIVATION_ID, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            location.href = '/cultivations';
        })
        .catch(function () { alert('재배지 삭제에 실패했습니다.'); });
}

function renderMainPhoto() {
    var placeholder = document.getElementById('photo-placeholder');
    var img = document.getElementById('photo-preview-img');
    if (PHOTOS.length === 0) {
        placeholder.style.display = 'flex';
        img.style.display = 'none';
        img.src = '';
        return;
    }
    placeholder.style.display = 'none';
    img.style.display = 'block';
    img.src = PHOTOS[0].uri;
}

// 업로드 박스(네모 칸) 자체에 현재 대표 사진(가장 최근 사진)을 미리보기로 보여줌.
// 사진이 없을 때만 업로드 아이콘을 보여주고, 있으면 그 안에 바로 사진이 뜨게 함.
function renderPhotoUploadPreview() {
    var box = document.getElementById('photo-upload-preview');
    if (PHOTOS.length === 0) {
        box.innerHTML = '<i data-lucide="upload" style="width:28px;height:28px;"></i>';
    } else {
        box.innerHTML = '<img src="' + PHOTOS[0].uri + '" alt="재배 사진" />';
    }
    lucide.createIcons();
}

function renderPhotoThumbs() {
    var wrap = document.getElementById('settings-photo-thumbs');
    wrap.innerHTML = '';
    PHOTOS.forEach(function (photo) {
        var thumb = document.createElement('div');
        thumb.className = 'settings-photo-thumb';
        thumb.innerHTML =
            '<img src="' + photo.uri + '" alt="재배 사진" />' +
            '<button type="button" class="settings-photo-thumb-remove" title="삭제">' +
            '<i data-lucide="x"></i></button>';
        thumb.querySelector('.settings-photo-thumb-remove').onclick = function () {
            deletePhoto(photo.photoId);
        };
        wrap.appendChild(thumb);
    });
    lucide.createIcons();
}

function handlePhotoSelect(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
        alert('사진 파일 크기는 10MB를 초과할 수 없습니다.');
        input.value = '';
        return;
    }

    var formData = new FormData();
    formData.append('file', file);

    fetch('/cultivations/' + CULTIVATION_ID + '/photos', {
        method: 'POST',
        body: formData
    })
        .then(function (res) {
            if (!res.ok) throw new Error('upload failed');
            return res.json();
        })
        .then(function (uploaded) {
            PHOTOS.unshift(uploaded);
            renderMainPhoto();
            renderPhotoThumbs();
            renderPhotoUploadPreview();
            input.value = '';
        })
        .catch(function () {
            alert('사진 업로드에 실패했습니다.');
            input.value = '';
        });
}

function deletePhoto(photoId) {
    if (!confirm('이 사진을 삭제하시겠어요?')) return;
    fetch('/cultivations/' + CULTIVATION_ID + '/photos/' + photoId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            PHOTOS = PHOTOS.filter(function (p) { return p.photoId !== photoId; });
            renderMainPhoto();
            renderPhotoThumbs();
            renderPhotoUploadPreview();
        })
        .catch(function () { alert('사진 삭제에 실패했습니다.'); });
}

renderPhotoThumbs();
renderPhotoUploadPreview();
