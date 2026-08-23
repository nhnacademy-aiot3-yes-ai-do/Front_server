lucide.createIcons();

var MUSHROOMS = [];
var SENSOR_TYPE_BY_NAME = {}; // { TEMPERATURE: {id, valueUnit}, HUMIDITY: {...}, CO2: {...}, LIGHT: {...} }

var mushroomPage = 1;
var MUSHROOM_PAGE_SIZE = 8;
var currentMushroomId = null;

function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

function thresholdOf(m, type) {
    var t = (m.thresholdInfoResponses || []).filter(function (x) { return x.sensorType && x.sensorType.type === type; })[0];
    return t ? { min: t.thresholdMin, max: t.thresholdMax } : null;
}

// 서버가 렌더링 시점에 심어준 SENSOR_TYPES_BOOTSTRAP / MUSHROOMS_BOOTSTRAP으로 초기화 (fetch 없음)
function initializeBootstrap() {
    SENSOR_TYPE_BY_NAME = {};
    (SENSOR_TYPES_BOOTSTRAP.sensorTypeInfoResponses || []).forEach(function (st) {
        SENSOR_TYPE_BY_NAME[st.type] = st;
    });

    MUSHROOMS = MUSHROOMS_BOOTSTRAP.mushroomReferenceInfoResponses || [];
    renderMushrooms();
}

function renderMushrooms() {
    var totalPages = Math.max(1, Math.ceil(MUSHROOMS.length / MUSHROOM_PAGE_SIZE));
    if (mushroomPage > totalPages) mushroomPage = totalPages;

    var start = (mushroomPage - 1) * MUSHROOM_PAGE_SIZE;
    var pageData = MUSHROOMS.slice(start, start + MUSHROOM_PAGE_SIZE);

    var tbody = document.getElementById('mushroom-tbody');
    tbody.innerHTML = '';
    pageData.forEach(function (m) {
        var temp = thresholdOf(m, 'TEMPERATURE');
        var humidity = thresholdOf(m, 'HUMIDITY');
        var tr = document.createElement('tr');
        tr.className = 'readonly';
        tr.innerHTML =
            '<td>' + m.mushroomNameKo + '</td>' +
            '<td>' + (m.mushroomNameEn || '') + '</td>' +
            '<td style="font-style:italic;color:var(--brown-500);">' + (m.mushroomScientificName || '') + '</td>' +
            '<td>' + (temp ? temp.min + '~' + temp.max + '°C' : '-') + '</td>' +
            '<td>' + (humidity ? humidity.min + '~' + humidity.max + '%' : '-') + '</td>' +
            '<td>' + formatDate(m.createdAt) + '</td>' +
            '<td>' +
            '<button class="row-action-btn" type="button" title="수정" onclick="openMushroomForm(' + m.id + ')"><i data-lucide="pencil"></i></button>' +
            '<button class="row-action-btn" type="button" title="삭제" onclick="openDeleteMushroom(' + m.id + ')"><i data-lucide="shield-alert"></i></button>' +
            '</td>';
        tbody.appendChild(tr);
    });

    renderMushroomPagination(totalPages);
    lucide.createIcons();
}

function goToMushroomPage(page) {
    mushroomPage = page;
    renderMushrooms();
}

function renderMushroomPagination(totalPages) {
    var wrap = document.getElementById('mushroom-pagination');
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }

    var prevDisabled = mushroomPage === 1 ? ' disabled' : '';
    var nextDisabled = mushroomPage === totalPages ? ' disabled' : '';
    wrap.innerHTML =
        '<button class="admin-page-btn' + prevDisabled + '" type="button" onclick="goToMushroomPage(' + (mushroomPage - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        '<span class="admin-page-label">' + mushroomPage + ' / ' + totalPages + '</span>' +
        '<button class="admin-page-btn' + nextDisabled + '" type="button" onclick="goToMushroomPage(' + (mushroomPage + 1) + ')"><i data-lucide="chevron-right"></i></button>';
}

function openMushroomForm(id) {
    currentMushroomId = id || null;
    document.getElementById('mushroom-form-error').style.display = 'none';

    var m = id ? MUSHROOMS.filter(function (x) { return x.id === id; })[0] : null;
    var temp = m ? thresholdOf(m, 'TEMPERATURE') : null;
    var humidity = m ? thresholdOf(m, 'HUMIDITY') : null;
    var co2 = m ? thresholdOf(m, 'CO2') : null;
    var light = m ? thresholdOf(m, 'LIGHT') : null;

    document.getElementById('mushroom-form-title').textContent = m ? '버섯 정보 수정' : '새 버섯 등록';
    document.getElementById('mf-name-ko').value = m ? m.mushroomNameKo : '';
    document.getElementById('mf-name-en').value = m ? (m.mushroomNameEn || '') : '';
    document.getElementById('mf-scientific').value = m ? (m.mushroomScientificName || '') : '';
    document.getElementById('mf-temp-min').value = temp ? temp.min : '';
    document.getElementById('mf-temp-max').value = temp ? temp.max : '';
    document.getElementById('mf-humidity-min').value = humidity ? humidity.min : '';
    document.getElementById('mf-humidity-max').value = humidity ? humidity.max : '';
    document.getElementById('mf-co2-min').value = co2 ? co2.min : '';
    document.getElementById('mf-co2-max').value = co2 ? co2.max : '';
    document.getElementById('mf-light-min').value = light ? light.min : '';
    document.getElementById('mf-light-max').value = light ? light.max : '';

    openModal('modal-mushroom-form');
}

function buildThreshold(typeName, minId, maxId) {
    var st = SENSOR_TYPE_BY_NAME[typeName];
    var minVal = document.getElementById(minId).value;
    var maxVal = document.getElementById(maxId).value;
    if (!st || minVal === '' || maxVal === '') return null;
    return { id: null, sensorTypeId: st.id, thresholdMin: Number(minVal), thresholdMax: Number(maxVal) };
}

function saveMushroomForm() {
    var nameKo = document.getElementById('mf-name-ko').value.trim();
    if (!nameKo) {
        document.getElementById('mushroom-form-error').style.display = 'block';
        return;
    }

    var thresholds = [
        buildThreshold('TEMPERATURE', 'mf-temp-min', 'mf-temp-max'),
        buildThreshold('HUMIDITY', 'mf-humidity-min', 'mf-humidity-max'),
        buildThreshold('CO2', 'mf-co2-min', 'mf-co2-max'),
        buildThreshold('LIGHT', 'mf-light-min', 'mf-light-max')
    ].filter(function (t) { return t !== null; });

    if (thresholds.length === 0) {
        document.getElementById('mushroom-form-error').textContent = '생육 환경 값을 하나 이상 입력해 주세요.';
        document.getElementById('mushroom-form-error').style.display = 'block';
        return;
    }

    var payload = {
        mushroomNameKo: nameKo,
        mushroomNameEn: document.getElementById('mf-name-en').value.trim(),
        mushroomScientificName: document.getElementById('mf-scientific').value.trim(),
        thresholds: thresholds
    };

    var request = currentMushroomId
        ? fetch('/admin/mushroom-references/' + currentMushroomId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        : fetch('/admin/mushroom-references', {
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
            alert('버섯 정보 저장에 실패했습니다.');
        });
}

function openDeleteMushroom(id) {
    currentMushroomId = id;
    openModal('modal-mushroom-delete');
}

function confirmDeleteMushroom() {
    fetch('/admin/mushroom-references/' + currentMushroomId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('delete failed');
            window.location.reload();
        })
        .catch(function () {
            alert('버섯 정보 삭제에 실패했습니다.');
        });
}

initializeBootstrap();