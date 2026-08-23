lucide.createIcons();

var SENSOR_TYPES = [];
var sensorTypePage = 1;
var SENSOR_TYPE_PAGE_SIZE = 8;
var currentSensorTypeId = null;

// 서버가 렌더링 시점에 심어준 SENSOR_TYPES_BOOTSTRAP으로 초기화 (fetch 없음)
function initializeBootstrap() {
    SENSOR_TYPES = SENSOR_TYPES_BOOTSTRAP.sensorTypeInfoResponses || [];
    renderSensorTypes();
}

function renderSensorTypes() {
    var totalPages = Math.max(1, Math.ceil(SENSOR_TYPES.length / SENSOR_TYPE_PAGE_SIZE));
    if (sensorTypePage > totalPages) sensorTypePage = totalPages;

    var start = (sensorTypePage - 1) * SENSOR_TYPE_PAGE_SIZE;
    var pageData = SENSOR_TYPES.slice(start, start + SENSOR_TYPE_PAGE_SIZE);

    var tbody = document.getElementById('sensor-type-tbody');
    tbody.innerHTML = '';
    pageData.forEach(function (t) {
        var tr = document.createElement('tr');
        tr.className = 'readonly';
        tr.innerHTML =
            '<td>' + t.type + '</td>' +
            '<td>' + t.valueUnit + '</td>' +
            '<td>' +
            '<button class="row-action-btn" type="button" title="수정" onclick="openSensorTypeForm(' + t.id + ')"><i data-lucide="pencil"></i></button>' +
            '<button class="row-action-btn" type="button" title="삭제" onclick="openDeleteSensorType(' + t.id + ')"><i data-lucide="shield-alert"></i></button>' +
            '</td>';
        tbody.appendChild(tr);
    });

    renderSensorTypePagination(totalPages);
    lucide.createIcons();
}

function goToSensorTypePage(page) {
    sensorTypePage = page;
    renderSensorTypes();
}

function renderSensorTypePagination(totalPages) {
    var wrap = document.getElementById('sensor-type-pagination');
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }

    var prevDisabled = sensorTypePage === 1 ? ' disabled' : '';
    var nextDisabled = sensorTypePage === totalPages ? ' disabled' : '';
    wrap.innerHTML =
        '<button class="admin-page-btn' + prevDisabled + '" type="button" onclick="goToSensorTypePage(' + (sensorTypePage - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        '<span class="admin-page-label">' + sensorTypePage + ' / ' + totalPages + '</span>' +
        '<button class="admin-page-btn' + nextDisabled + '" type="button" onclick="goToSensorTypePage(' + (sensorTypePage + 1) + ')"><i data-lucide="chevron-right"></i></button>';
}

function openSensorTypeForm(id) {
    currentSensorTypeId = id || null;
    document.getElementById('sensor-type-form-error').style.display = 'none';

    var t = id ? SENSOR_TYPES.filter(function (x) { return x.id === id; })[0] : null;

    document.getElementById('sensor-type-form-title').textContent = t ? '센서 타입 수정' : '새 센서 타입 등록';
    document.getElementById('st-type').value = t ? t.type : '';
    document.getElementById('st-unit').value = t ? t.valueUnit : '';

    openModal('modal-sensor-type-form');
}

function saveSensorTypeForm() {
    var type = document.getElementById('st-type').value.trim();
    var valueUnit = document.getElementById('st-unit').value.trim();

    if (!type || !valueUnit) {
        document.getElementById('sensor-type-form-error').textContent = '측정 타입과 단위를 모두 입력해 주세요.';
        document.getElementById('sensor-type-form-error').style.display = 'block';
        return;
    }

    var payload = { type: type, valueUnit: valueUnit };

    var request = currentSensorTypeId
        ? fetch('/admin/sensor-types/' + currentSensorTypeId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        : fetch('/admin/sensor-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

    request
        .then(function (res) {
            if (!res.ok) throw new Error('save failed');
            window.location.reload();
        })
        .catch(function () {
            document.getElementById('sensor-type-form-error').textContent = '이미 등록된 측정 타입/단위 조합이거나 저장에 실패했어요.';
            document.getElementById('sensor-type-form-error').style.display = 'block';
        });
}

function openDeleteSensorType(id) {
    currentSensorTypeId = id;
    openModal('modal-sensor-type-delete');
}

function confirmDeleteSensorType() {
    fetch('/admin/sensor-types/' + currentSensorTypeId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            window.location.reload();
        })
        .catch(function () {
            alert('센서 타입 삭제에 실패했습니다. 이미 사용 중인 타입일 수 있어요.');
        });
}

initializeBootstrap();