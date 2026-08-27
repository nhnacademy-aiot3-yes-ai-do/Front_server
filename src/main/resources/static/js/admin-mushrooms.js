lucide.createIcons();

var MUSHROOMS = [];
var SENSOR_TYPE_BY_NAME = {}; // { TEMPERATURE: {id, valueUnit}, HUMIDITY: {...}, CO2: {...}, LIGHT: {...} }

var mushroomPage = 1;
var MUSHROOM_PAGE_SIZE = 8;
var currentMushroomId = null;

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

function thresholdOf(m, type, thresholdType) {
    var t = (m.thresholdInfoResponses || []).filter(function (x) {
        return x.sensorType && x.sensorType.type === type && x.thresholdType === thresholdType;
    })[0];
    return t ? { id: t.id, min: t.thresholdMin, max: t.thresholdMax } : null;
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

    document.getElementById('mushroom-total-count').textContent = MUSHROOMS.length;

    var start = (mushroomPage - 1) * MUSHROOM_PAGE_SIZE;
    var pageData = MUSHROOMS.slice(start, start + MUSHROOM_PAGE_SIZE);

    var tbody = document.getElementById('mushroom-tbody');
    tbody.innerHTML = '';
    pageData.forEach(function (m) {
        var temp = thresholdOf(m, 'TEMPERATURE', 'GROWTH');
        var humidity = thresholdOf(m, 'HUMIDITY', 'GROWTH');
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(m.mushroomNameKo) + '</td>' +
            '<td>' + escapeHtml(m.mushroomNameEn) + '</td>' +
            '<td style="font-style:italic;color:var(--brown-500);">' + escapeHtml(m.mushroomScientificName) + '</td>' +
            '<td>' + (temp ? temp.min + '~' + temp.max + '°C' : '-') + '</td>' +
            '<td>' + (humidity ? humidity.min + '~' + humidity.max + '%' : '-') + '</td>' +
            '<td>' + formatDate(m.createdAt) + '</td>' +
            '<td><div class="row-actions">' +
            '<button type="button" title="수정" onclick="openMushroomForm(' + Number(m.id) + ')"><i data-lucide="pencil"></i></button>' +
            '<button type="button" title="삭제" onclick="openDeleteMushroom(' + Number(m.id) + ')"><i data-lucide="trash-2"></i></button>' +
            '</div></td>';
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

    var pageBtns = '';
    for (var p = 1; p <= totalPages; p++) {
        pageBtns += '<button class="page' + (p === mushroomPage ? ' active' : '') + '" type="button" onclick="goToMushroomPage(' + p + ')">' + p + '</button>';
    }

    wrap.innerHTML =
        '<button class="page-arrow' + prevDisabled + '" type="button" onclick="goToMushroomPage(' + (mushroomPage - 1) + ')"><i data-lucide="chevron-left"></i></button>' +
        pageBtns +
        '<button class="page-arrow' + nextDisabled + '" type="button" onclick="goToMushroomPage(' + (mushroomPage + 1) + ')"><i data-lucide="chevron-right"></i></button>';
    lucide.createIcons();
}

function openMushroomForm(id) {
    currentMushroomId = id || null;
    document.getElementById('mushroom-form-error').style.display = 'none';

    var m = id ? MUSHROOMS.filter(function (x) { return x.id === id; })[0] : null;
    var temp = m ? thresholdOf(m, 'TEMPERATURE', 'GROWTH') : null;
    var humidity = m ? thresholdOf(m, 'HUMIDITY', 'GROWTH') : null;
    var co2 = m ? thresholdOf(m, 'CO2', 'GROWTH') : null;
    var light = m ? thresholdOf(m, 'LIGHT', 'GROWTH') : null;
    var harvestTemp = m ? thresholdOf(m, 'TEMPERATURE', 'HARVEST') : null;
    var harvestHumidity = m ? thresholdOf(m, 'HUMIDITY', 'HARVEST') : null;
    var harvestCo2 = m ? thresholdOf(m, 'CO2', 'HARVEST') : null;
    var harvestLight = m ? thresholdOf(m, 'LIGHT', 'HARVEST') : null;

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
    document.getElementById('mf-harvest-temp-min').value = harvestTemp ? harvestTemp.min : '';
    document.getElementById('mf-harvest-temp-max').value = harvestTemp ? harvestTemp.max : '';
    document.getElementById('mf-harvest-humidity-min').value = harvestHumidity ? harvestHumidity.min : '';
    document.getElementById('mf-harvest-humidity-max').value = harvestHumidity ? harvestHumidity.max : '';
    document.getElementById('mf-harvest-co2-min').value = harvestCo2 ? harvestCo2.min : '';
    document.getElementById('mf-harvest-co2-max').value = harvestCo2 ? harvestCo2.max : '';
    document.getElementById('mf-harvest-light-min').value = harvestLight ? harvestLight.min : '';
    document.getElementById('mf-harvest-light-max').value = harvestLight ? harvestLight.max : '';

    openModal('modal-mushroom-form');
}

function buildThreshold(typeName, thresholdType, minId, maxId, mushroom) {
    var st = SENSOR_TYPE_BY_NAME[typeName];
    var minVal = document.getElementById(minId).value;
    var maxVal = document.getElementById(maxId).value;
    if (!st || minVal === '' || maxVal === '') return null;
    var existing = mushroom ? thresholdOf(mushroom, typeName, thresholdType) : null;
    return { id: existing ? existing.id : null, sensorTypeId: st.id, thresholdType: thresholdType, thresholdMin: Number(minVal), thresholdMax: Number(maxVal) };
}

function saveMushroomForm() {
    var nameKo = document.getElementById('mf-name-ko').value.trim();
    if (!nameKo) {
        document.getElementById('mushroom-form-error').style.display = 'block';
        return;
    }

    var mushroom = currentMushroomId ? MUSHROOMS.filter(function (x) { return x.id === currentMushroomId; })[0] : null;
    var thresholdFieldPairs = [
        ['mf-temp-min', 'mf-temp-max'], ['mf-humidity-min', 'mf-humidity-max'],
        ['mf-co2-min', 'mf-co2-max'], ['mf-light-min', 'mf-light-max'],
        ['mf-harvest-temp-min', 'mf-harvest-temp-max'], ['mf-harvest-humidity-min', 'mf-harvest-humidity-max'],
        ['mf-harvest-co2-min', 'mf-harvest-co2-max'], ['mf-harvest-light-min', 'mf-harvest-light-max']
    ];
    if (thresholdFieldPairs.some(function (pair) {
        return (document.getElementById(pair[0]).value === '') !== (document.getElementById(pair[1]).value === '');
    })) {
        document.getElementById('mushroom-form-error').textContent = '각 생육 환경 값은 최소와 최대를 모두 입력하거나 모두 비워 주세요.';
        document.getElementById('mushroom-form-error').style.display = 'block';
        return;
    }
    var thresholds = [
        buildThreshold('TEMPERATURE', 'GROWTH', 'mf-temp-min', 'mf-temp-max', mushroom),
        buildThreshold('HUMIDITY', 'GROWTH', 'mf-humidity-min', 'mf-humidity-max', mushroom),
        buildThreshold('CO2', 'GROWTH', 'mf-co2-min', 'mf-co2-max', mushroom),
        buildThreshold('LIGHT', 'GROWTH', 'mf-light-min', 'mf-light-max', mushroom),
        buildThreshold('TEMPERATURE', 'HARVEST', 'mf-harvest-temp-min', 'mf-harvest-temp-max', mushroom),
        buildThreshold('HUMIDITY', 'HARVEST', 'mf-harvest-humidity-min', 'mf-harvest-humidity-max', mushroom),
        buildThreshold('CO2', 'HARVEST', 'mf-harvest-co2-min', 'mf-harvest-co2-max', mushroom),
        buildThreshold('LIGHT', 'HARVEST', 'mf-harvest-light-min', 'mf-harvest-light-max', mushroom)
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
    document.getElementById('mushroom-delete-form').action = '/admin/mushroom-references/' + id;
    openModal('modal-mushroom-delete');
}

initializeBootstrap();