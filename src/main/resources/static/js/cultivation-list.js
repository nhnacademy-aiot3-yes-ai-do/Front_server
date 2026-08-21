lucide.createIcons();

var PAGE_SIZE = 6;

var SENSOR_LIST = [];
var SENSOR_TYPES = [];

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
    tr.innerHTML =
        '<td>' + c.name + '</td>' +
        '<td>' + (c.mushroomId != null ? '버섯 #' + c.mushroomId : '-') + '</td>' +
        '<td>' + (c.memberCount != null ? c.memberCount + '명' : '-') + '</td>' +
        '<td>' + (c.ownerNickname || '-') + '</td>' +
        '<td>' + formatDate(c.createdAt) + '</td>';
    return tr;
}

function statusLabel(status) {
    if (status === 'ONLINE') return '온라인';
    if (status === 'ERROR') return '오류';
    return '오프라인';
}

function renderSensorRow(s) {
    var tr = document.createElement('tr');
    var typesLabel = (s.sensorTypes || []).map(function (t) { return t.type + '(' + t.valueUnit + ')'; }).join(', ') || '-';
    tr.innerHTML =
        '<td>' + s.cultivationName + '</td>' +
        '<td>' + s.location + '</td>' +
        '<td>' + s.locationDetail + '</td>' +
        '<td>' + s.deviceModel + '</td>' +
        '<td>' + s.deviceEui + '</td>' +
        '<td>' + typesLabel + '</td>' +
        '<td>' + statusLabel(s.sensorStatus) + '</td>' +
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
    var totalPages = Math.max(1, Math.ceil(state.data.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages - 1);

    var tbody = document.getElementById(key + '-tbody');
    tbody.innerHTML = '';
    var start = state.page * PAGE_SIZE;
    state.data.slice(start, start + PAGE_SIZE).forEach(function (item) {
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
    var totalPages = Math.max(1, Math.ceil(state.data.length / PAGE_SIZE));
    state.page = Math.max(0, Math.min(totalPages - 1, state.page + delta));
    renderList(key);
}

function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) { btn.classList.remove('active'); });
    document.querySelectorAll('.list-panel').forEach(function (panel) { panel.classList.remove('active'); });
    event.currentTarget.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

function loadSensorTypes() {
    return fetchWithTimeout('/cultivations/sensor-types', {}, 8000)
        .then(function (res) {
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    window.location.href = '/login';
                    return Promise.reject(new Error('unauthorized'));
                }
                return { sensorTypeInfoResponses: [] };
            }
            return res.json();
        })
        .then(function (data) {
            SENSOR_TYPES = data.sensorTypeInfoResponses || [];
        })
        .catch(function (err) {
            console.warn('sensor-types 요청 실패/타임아웃:', err && err.name, err && err.message);
            SENSOR_TYPES = [];
        });
}

// 센서는 재배지 단위 API라, 내가 가진 재배지마다 조회해서 합침
function loadAllSensors() {
    if (cultivationData.length === 0) {
        SENSOR_LIST = [];
        listState.sensor.data = SENSOR_LIST;
        renderList('sensor');
        return Promise.resolve();
    }
    var requests = cultivationData.map(function (c) {
        return fetchWithTimeout('/cultivations/' + c.cultivationId + '/sensors', {}, 8000)
            .then(function (res) {
                if (res.status === 401 || res.status === 403) {
                    window.location.href = '/login';
                    return { sensors: [] };
                }
                return res.ok ? res.json() : { sensors: [] };
            })
            .then(function (data) {
                return (data.sensors || []).map(function (s) {
                    return {
                        cultivationId: c.cultivationId,
                        cultivationName: c.name,
                        sensorId: s.sensorId,
                        deviceEui: s.deviceEui,
                        deviceModel: s.deviceModel,
                        deviceName: s.deviceName,
                        location: s.location,
                        locationDetail: s.locationDetail,
                        sensorStatus: s.sensorStatus,
                        sensorTypes: s.sensorTypes || []
                    };
                });
            })
            .catch(function (err) {
                console.warn('sensors(' + c.cultivationId + ') 요청 실패/타임아웃:', err && err.name, err && err.message);
                return [];
            });
    });
    return Promise.all(requests).then(function (lists) {
        SENSOR_LIST = lists.reduce(function (acc, l) { return acc.concat(l); }, []);
        listState.sensor.data = SENSOR_LIST;
        renderList('sensor');
    });
}

function deleteSensor(cultivationId, sensorId) {
    if (!confirm('이 센서를 삭제하시겠어요?')) return;
    fetch('/cultivations/' + cultivationId + '/sensors/' + sensorId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            return loadAllSensors();
        })
        .then(function () { lucide.createIcons(); })
        .catch(function () { alert('센서 삭제에 실패했습니다.'); });
}

function populateCultivationSelect() {
    var wrapperEl = document.getElementById('ms-cultivation');
    var menu = document.getElementById('ms-cultivation-menu');
    menu.innerHTML = cultivationData.map(function (c) {
        return '<div class="msh-select-option" data-value="' + c.cultivationId + '" onclick="selectMshOption(this)">' + c.name + '</div>';
    }).join('');
    wrapperEl.dataset.value = '';
    wrapperEl.querySelector('.msh-select-value').textContent = '재배지를 선택하세요';
}

function renderSensorTypeCheckList() {
    var wrap = document.getElementById('ms-type-list');
    wrap.innerHTML = '';
    SENSOR_TYPES.forEach(function (t) {
        var row = document.createElement('div');
        row.className = 'sensor-type-check-row';
        row.innerHTML =
            '<label class="st-checkbox-label">' +
            '<input type="checkbox" data-sensor-type-id="' + t.id + '" onchange="toggleSensorTypeRow(this)" />' +
            '<span>' + t.type + ' (' + t.valueUnit + ')</span>' +
            '</label>' +
            '<input type="number" class="st-min" placeholder="최소" disabled oninput="clearThresholdValidation(this)" />' +
            '<input type="number" class="st-max" placeholder="최대" disabled oninput="clearThresholdValidation(this)" />' +
            '<button type="button" class="st-validate-btn" onclick="validateThreshold(this)" disabled>검증</button>' +
            '<span class="st-validate-msg"></span>';
        wrap.appendChild(row);
    });
}

function toggleSensorTypeRow(checkbox) {
    var row = checkbox.closest('.sensor-type-check-row');
    var disabled = !checkbox.checked;
    row.querySelector('.st-min').disabled = disabled;
    row.querySelector('.st-max').disabled = disabled;
    row.querySelector('.st-validate-btn').disabled = disabled;
    if (disabled) {
        row.querySelector('.st-min').value = '';
        row.querySelector('.st-max').value = '';
    }
    clearThresholdValidation(checkbox);
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

    var checkbox = row.querySelector('input[type="checkbox"]');
    var sensorTypeId = Number(checkbox.dataset.sensorTypeId);
    var labelText = (checkbox.nextElementSibling ? checkbox.nextElementSibling.textContent : '');
    var match = labelText.match(/^(.*?)\s*\((.*?)\)$/);
    var sensorTypeName = match ? match[1].trim() : labelText;
    var sensorUnit = match ? match[2].trim() : '';
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

    fetch('/cultivations/sensor-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cultivationId: Number(cultivationId),
            sensorTypeId: sensorTypeId,
            sensorTypeName: sensorTypeName,
            sensorUnit: sensorUnit,
            userMin: minNum,
            userMax: maxNum
        })
    })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            // AI가 돌려준 진짜 isValid(true/false)와 피드백 문구 출력!
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
    renderSensorTypeCheckList();
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
        var checkbox = row.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) return;
        if (row.dataset.validated !== 'true') {
            unvalidated = true;
            return;
        }
        var min = row.querySelector('.st-min').value;
        var max = row.querySelector('.st-max').value;
        if (min === '' || max === '') return;
        if (Number(min) >= Number(max)) { invalidRange = true; return; }
        sensorSettings.push({
            sensorTypeId: Number(checkbox.dataset.sensorTypeId),
            thresholdMin: Number(min),
            thresholdMax: Number(max)
        });
    });
    if (unvalidated) {
        alert('선택하신 모든 센서의 임계값 검증을 먼저 완료(통과)해주세요.');
        return;
    }

    if (invalidRange) {
        alert('최소값은 최대값보다 작아야 해요. 검증 버튼으로 다시 확인해주세요.');
        return;
    }
    if (sensorSettings.length === 0) {
        alert('측정 타입을 하나 이상 선택하고 임계값을 입력해주세요.');
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
            return loadAllSensors();
        })
        .then(function () {
            closeModal('modal-sensor');
        })
        .catch(function () { alert('센서 등록에 실패했습니다.'); });
}

renderList('cultivation');
Promise.all([loadSensorTypes(), loadAllSensors()])
    .then(function () {
        lucide.createIcons();
        hideLoadingOverlay();
    })
    .catch(function () {
        lucide.createIcons();
        hideLoadingOverlay();
    });
