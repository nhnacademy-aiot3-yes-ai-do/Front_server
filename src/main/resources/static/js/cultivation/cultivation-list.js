lucide.createIcons();

// 센서 탭은 컬럼이 8개라 재배지 탭(5개)보다 줄바꿈에 취약해서, 같은 영역에서
// 스크롤 없이 페이지네이션만으로 꽉 차게 보이도록 탭별로 다른 페이지 크기를 둠.
var PAGE_SIZES = { cultivation: 7, sensor: 6 };

var cultivationItemsData = (cultivationListPageData && cultivationListPageData.cultivations) || [];
var cultivationData = cultivationItemsData.map(function (item) { return item.cultivation; });
var sensorTypesData = (cultivationListPageData && cultivationListPageData.sensorTypes) || [];

// mushroomId -> 한글 품종명 매핑 ("버섯 #1" 대신 "느타리버섯" 등으로 보여주기 위함)
var MUSHROOM_NAME_MAP = {};
(mushroomRefsData || []).forEach(function (m) {
    MUSHROOM_NAME_MAP[m.id] = m.mushroomNameKo;
});

var SENSOR_LIST = [];
var SENSOR_TYPES = [];

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var listState = {
    cultivation: { page: 0, data: cultivationData },
    sensor: { page: 0, data: SENSOR_LIST }
};

function fetchWithTimeout(url, options, timeoutMs) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs || 8000);
    var opts = Object.assign({}, options || {}, { signal: controller.signal });
    return fetch(url, opts).finally(function () {
        clearTimeout(timeoutId);
    });
}

function formatDate(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
}

function renderCultivationRow(c) {
    var tr = document.createElement('tr');
    tr.onclick = function () { location.href = '/cultivations/' + c.cultivationId; };
    // 컬럼 너비를 고정(table-layout: fixed)했더니 긴 이름은 말줄임표로 잘리게 됨 ->
    // title 속성으로 hover 시 전체 텍스트를 볼 수 있게 함
    tr.innerHTML =
        '<td title="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</td>' +
        '<td>' + (c.mushroomId != null ? (MUSHROOM_NAME_MAP[c.mushroomId] || '버섯 #' + c.mushroomId) : '-') + '</td>' +
        '<td>' + (c.memberCount != null ? c.memberCount + '명' : '-') + '</td>' +
        '<td title="' + escapeHtml(c.ownerNickname || '-') + '">' + escapeHtml(c.ownerNickname || '-') + '</td>' +
        '<td>' + formatDate(c.createdAt) + '</td>';
    return tr;
}

function statusLabel(status) {
    if (status === 'ONLINE') return '온라인';
    if (status === 'ERROR') return '오류';
    return '오프라인';
}

function statusBadgeClass(status) {
    if (status === 'ONLINE') return 'online';
    if (status === 'ERROR') return 'error';
    return 'offline';
}

function renderSensorRow(s) {
    var tr = document.createElement('tr');
    var typesLabel = (s.sensorTypes || []).map(function (t) { return t.type + '(' + t.valueUnit + ')'; }).join(', ') || '-';
    // 컬럼 너비를 고정(table-layout: fixed)했더니 긴 값은 말줄임표로 잘리게 됨 ->
    // title 속성으로 hover 시 전체 텍스트를 볼 수 있게 함
    tr.innerHTML =
        '<td title="' + escapeHtml(s.cultivationName) + '">' + escapeHtml(s.cultivationName) + '</td>' +
        '<td title="' + escapeHtml(s.location) + '">' + escapeHtml(s.location) + '</td>' +
        '<td title="' + escapeHtml(s.locationDetail) + '">' + escapeHtml(s.locationDetail) + '</td>' +
        '<td title="' + escapeHtml(s.deviceModel) + '">' + escapeHtml(s.deviceModel) + '</td>' +
        '<td title="' + escapeHtml(s.deviceEui) + '">' + escapeHtml(s.deviceEui) + '</td>' +
        '<td title="' + escapeHtml(typesLabel) + '">' + escapeHtml(typesLabel) + '</td>' +
        '<td><span class="sensor-status-badge ' + statusBadgeClass(s.sensorStatus) + '">' + statusLabel(s.sensorStatus) + '</span></td>' +
        '<td></td>';
    var actionTd = tr.lastElementChild;
    var btn = document.createElement('button');
    btn.className = 'row-action-btn';
    btn.type = 'button';
    btn.title = '삭제';
    btn.innerHTML = '<i data-lucide="trash-2"></i>';
    btn.onclick = function (event) {
        event.stopPropagation();
        deleteSensor(s.cultivationId, s.sensorId);
    };
    actionTd.appendChild(btn);
    return tr;
}

var ROW_RENDERERS = { cultivation: renderCultivationRow, sensor: renderSensorRow };

function renderList(key) {
    var state = listState[key];
    var pageSize = PAGE_SIZES[key];
    var totalPages = Math.max(1, Math.ceil(state.data.length / pageSize));
    state.page = Math.min(state.page, totalPages - 1);

    var tbody = document.getElementById(key + '-tbody');
    tbody.innerHTML = '';
    var start = state.page * pageSize;
    state.data.slice(start, start + pageSize).forEach(function (item) {
        tbody.appendChild(ROW_RENDERERS[key](item));
    });

    var dotsWrap = document.getElementById(key + '-dots');
    dotsWrap.innerHTML = '';
    for (var i = 0; i < totalPages; i++) {
        var dot = document.createElement('span');
        dot.className = 'page-dot' + (i === state.page ? ' active' : '');
        dot.onclick = (function (pageIdx) {
            return function () { state.page = pageIdx; renderList(key); };
        })(i);
        dotsWrap.appendChild(dot);
    }

    var pagination = document.getElementById(key + '-pagination');
    pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
}

function changePage(key, delta) {
    var state = listState[key];
    var totalPages = Math.max(1, Math.ceil(state.data.length / PAGE_SIZES[key]));
    state.page = Math.max(0, Math.min(totalPages - 1, state.page + delta));
    renderList(key);
}

function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) { btn.classList.remove('active'); });
    document.querySelectorAll('.list-panel').forEach(function (panel) { panel.classList.remove('active'); });
    event.currentTarget.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

// 목록 화면의 초기 데이터는 SSR bootstrap payload로만 초기화합니다.
// 페이지 진입 중 브라우저가 재배지 수만큼 센서를 다시 요청하지 않습니다.
function initializeSensorBootstrap() {
    SENSOR_TYPES = Array.isArray(sensorTypesData) ? sensorTypesData : [];
    SENSOR_LIST = cultivationItemsData.flatMap(function (item) {
        var cultivation = item.cultivation || {};
        var response = item.sensors || {};
        return (response.sensors || []).map(function (sensor) {
            return {
                cultivationId: cultivation.cultivationId,
                cultivationName: cultivation.name,
                sensorId: sensor.sensorId,
                deviceEui: sensor.deviceEui,
                deviceModel: sensor.deviceModel,
                deviceName: sensor.deviceName,
                location: sensor.location,
                locationDetail: sensor.locationDetail,
                sensorStatus: sensor.sensorStatus,
                sensorTypes: sensor.sensorTypes || []
            };
        });
    });
    listState.sensor.data = SENSOR_LIST;
    renderList('sensor');
}

function deleteSensor(cultivationId, sensorId) {
    if (!confirm('이 센서를 삭제하시겠어요?')) return;
    fetch('/cultivations/' + cultivationId + '/sensors/' + sensorId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            window.location.reload();
        })
        .catch(function () { alert('센서 삭제에 실패했습니다.'); });
}

function populateCultivationSelect() {
    var wrapperEl = document.getElementById('ms-cultivation');
    var menu = document.getElementById('ms-cultivation-menu');
    menu.innerHTML = cultivationData.map(function (c) {
        return '<div class="msh-select-option" data-value="' + Number(c.cultivationId) + '" onclick="selectMshOption(this)">' + escapeHtml(c.name) + '</div>';
    }).join('');
    wrapperEl.dataset.value = '';
    wrapperEl.querySelector('.msh-select-value').textContent = '재배지를 선택하세요';
}

function populateSensorTypeSelect() {
    var select = document.getElementById('ms-type-select');
    select.innerHTML = '<option value="">추가할 측정 타입을 선택하세요</option>' +
        SENSOR_TYPES.map(function (t) {
            return '<option value="' + Number(t.id) + '" data-name="' + escapeHtml(t.type) + '" data-unit="' + escapeHtml(t.valueUnit) + '">' +
                escapeHtml(t.type) + ' (' + escapeHtml(t.valueUnit) + ')</option>';
        }).join('');
}

function addSensorTypeRow() {
    var select = document.getElementById('ms-type-select');
    var selectedOption = select.options[select.selectedIndex];
    var sensorTypeId = Number(select.value);

    if (!sensorTypeId) {
        alert('추가할 측정 타입을 선택해주세요.');
        return;
    }

    var alreadyExists = document.querySelector('#ms-type-list .sensor-type-check-row[data-sensor-type-id="' + sensorTypeId + '"]');
    if (alreadyExists) {
        alert('이미 추가된 측정 타입입니다.');
        return;
    }

    var sensorTypeName = selectedOption.dataset.name;
    var sensorUnit = selectedOption.dataset.unit;

    var wrap = document.getElementById('ms-type-list');
    var row = document.createElement('div');
    row.className = 'sensor-type-check-row';
    row.dataset.sensorTypeId = sensorTypeId;
    row.dataset.sensorTypeName = sensorTypeName;
    row.dataset.sensorUnit = sensorUnit;
    row.innerHTML =
        '<span class="st-type-label">' + escapeHtml(sensorTypeName) + ' (' + escapeHtml(sensorUnit) + ')</span>' +
        '<input type="number" class="st-min" placeholder="최소" oninput="clearThresholdValidation(this)" />' +
        '<input type="number" class="st-max" placeholder="최대" oninput="clearThresholdValidation(this)" />' +
        '<button type="button" class="st-validate-btn" onclick="validateThreshold(this)">검증</button>' +
        '<button type="button" class="st-remove-btn" title="삭제" onclick="removeSensorTypeRow(this)">✕</button>' +
        '<span class="st-validate-msg"></span>';

    wrap.appendChild(row);
    select.value = '';
}

function removeSensorTypeRow(button) {
    var row = button.closest('.sensor-type-check-row');
    if (row) row.remove();
}

function clearThresholdValidation(el) {
    var row = el.closest('.sensor-type-check-row');
    var msg = row.querySelector('.st-validate-msg');
    msg.textContent = '';
    msg.className = 'st-validate-msg';
    row.dataset.validated = '';
}

function validateThreshold(button) {
    var row = button.closest('.sensor-type-check-row');
    var msg = row.querySelector('.st-validate-msg');
    var min = row.querySelector('.st-min').value;
    var max = row.querySelector('.st-max').value;

    var sensorTypeId = Number(row.dataset.sensorTypeId);
    var sensorTypeName = row.dataset.sensorTypeName;
    var sensorUnit = row.dataset.sensorUnit;
    var cultivationId = document.getElementById('ms-cultivation').dataset.value;

    function showResult(valid, text) {
        msg.textContent = text;
        msg.className = 'st-validate-msg ' + (valid ? 'valid' : 'invalid');
        row.dataset.validated = valid ? 'true' : '';
    }

    if (!cultivationId) {
        showResult(false, '재배지를 먼저 선택해주세요.');
        return;
    }

    if (min === '' || max === '') {
        showResult(false, '최소값과 최대값을 모두 입력해주세요.');
        return;
    }
    var minNum = Number(min);
    var maxNum = Number(max);
    if (isNaN(minNum) || isNaN(maxNum)) {
        showResult(false, '숫자만 입력할 수 있어요.');
        return;
    }
    if (minNum >= maxNum) {
        showResult(false, '최소값은 최대값보다 작아야 해요.');
        return;
    }
    showResult(false, 'AI 검증 중...');

    fetch('/cultivations/' + cultivationId + '/sensor-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sensorTypeId: sensorTypeId,
            sensorTypeName: sensorTypeName,
            sensorUnit: sensorUnit,
            userMin: minNum,
            userMax: maxNum
        })
    })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            if (result.data) {
                showResult(result.data.isValid, result.data.message);
            } else {
                showResult(false, '검증에 실패했습니다.');
            }
        })
        .catch(function () {
            showResult(false, '서버 통신 오류가 발생했습니다.');
        });
}

function openSensorModal() {
    populateCultivationSelect();
    populateSensorTypeSelect();
    document.getElementById('ms-type-list').innerHTML = '';
    ['ms-name', 'ms-model', 'ms-location', 'ms-location-detail', 'ms-serial'].forEach(function (id) {
        document.getElementById(id).value = '';
    });
    openModal('modal-sensor');
}

function registerSensor() {
    var cultivationId = document.getElementById('ms-cultivation').dataset.value;
    var deviceName = document.getElementById('ms-name').value.trim();
    var deviceModel = document.getElementById('ms-model').value.trim();
    var location = document.getElementById('ms-location').value.trim();
    var locationDetail = document.getElementById('ms-location-detail').value.trim();
    var deviceEui = document.getElementById('ms-serial').value.trim();

    if (!cultivationId) { alert('재배지를 선택해주세요.'); return; }
    if (!deviceName || !deviceModel || !location || !locationDetail || !deviceEui) {
        alert('모든 항목을 입력해주세요.');
        return;
    }

    var sensorSettings = [];
    var invalidRange = false;
    var unvalidated = false;

    document.querySelectorAll('#ms-type-list .sensor-type-check-row').forEach(function (row) {
        if (row.dataset.validated !== 'true') {
            unvalidated = true;
            return;
        }
        var min = row.querySelector('.st-min').value;
        var max = row.querySelector('.st-max').value;
        if (min === '' || max === '') return;
        if (Number(min) >= Number(max)) { invalidRange = true; return; }

        sensorSettings.push({
            sensorTypeId: Number(row.dataset.sensorTypeId),
            thresholdMin: Number(min),
            thresholdMax: Number(max)
        });
    });

    if (invalidRange) {
        alert('최소값은 최대값보다 작아야 해요. 검증 버튼으로 다시 확인해주세요.');
        return;
    }

    if (sensorSettings.length === 0 && !unvalidated) {
        alert('측정 타입을 하나 이상 추가해주세요.');
        return;
    }
    if (unvalidated) {
        alert('추가하신 모든 센서의 임계값 검증을 먼저 완료(통과)해주세요.');
        return;
    }

    fetch('/cultivations/' + cultivationId + '/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deviceEui: deviceEui,
            deviceModel: deviceModel,
            deviceName: deviceName,
            location: location,
            locationDetail: locationDetail,
            sensorSettings: sensorSettings
        })
    })
        .then(function (res) {
            if (!res.ok) throw new Error('register failed');
            window.location.reload();
        })
        .catch(function () { alert('센서 등록에 실패했습니다.'); });
}

renderList('cultivation');
initializeSensorBootstrap();
lucide.createIcons();
