lucide.createIcons();

var SENSOR_TYPES = [];
var sensorTypePage = 1;
var SENSOR_TYPE_PAGE_SIZE = 8;
var currentSensorTypeId = null;

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
            '<td>' + escapeHtml(t.type) + '</td>' +
            '<td>' + escapeHtml(t.valueUnit) + '</td>' +
            '<td>' +
            '<button class="row-action-btn" type="button" title="수정" onclick="openSensorTypeForm(' + Number(t.id) + ')"><i data-lucide="pencil"></i></button>' +
            '<button class="row-action-btn" type="button" title="삭제" onclick="openDeleteSensorType(' + Number(t.id) + ')"><i data-lucide="shield-alert"></i></button>' +
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
    document.getElementById('sensor-type-form').action = t
        ? '/admin/sensor-types/' + id
        : '/admin/sensor-types';
    document.getElementById('sensor-type-method').value = t ? 'PUT' : 'POST';
    document.getElementById('st-type').value = t ? t.type : '';
    document.getElementById('st-unit').value = t ? t.valueUnit : '';

    openModal('modal-sensor-type-form');
}

function openDeleteSensorType(id) {
    currentSensorTypeId = id;
    document.getElementById('sensor-type-delete-form').action = '/admin/sensor-types/' + id;
    openModal('modal-sensor-type-delete');
}

initializeBootstrap();