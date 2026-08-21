var historyState = { selectedId: null };

function findCultivation(id) {
    return CULTIVATION_HISTORY.filter(function (c) { return c.id === id; })[0];
}

function hashSeed(str) {
    var hash = 0;
    if (!str) return 0;
    for (var i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function buildHistorySummary(c) {
    var seed = hashSeed(c.name);
    var avgTemp = 17 + (seed % 6);
    var avgHumidity = 52 + ((seed >> 3) % 18);
    var pestDays = (seed >> 12) % 3;

    var summary =
        '총 ' + c.amount + 'g을 수확했어요. ' +
        '평균 온도 ' + avgTemp + '°C, 평균 습도 ' + avgHumidity + '%를 유지했고, ' +
        (pestDays === 0 ? '병충해 없이 잘 마무리된 재배였습니다.' : '병충해 징후가 ' + pestDays + '일 감지되었어요.');

    return { avgTemp: avgTemp, avgHumidity: avgHumidity, pestDays: pestDays, summary: summary };
}

function renderHistorySidebar() {
    var list = document.getElementById('history-name-list');
    if (CULTIVATION_HISTORY.length === 0) {
        list.innerHTML = '<div class="history-empty">종료된 재배가 없습니다.</div>';
        return;
    }
    list.innerHTML = CULTIVATION_HISTORY.map(function (c) {
        var activeClass = c.id === historyState.selectedId ? ' active' : '';
        return '<div class="history-name-item' + activeClass + '" onclick="selectHistoryItem(' + c.id + ')">' + c.name + '</div>';
    }).join('');
}

function selectHistoryItem(id) {
    historyState.selectedId = id;
    renderHistorySidebar();
    renderHistoryDetail(id);
}

function renderHistoryDetail(id) {
    var c = findCultivation(id);
    var detail = document.getElementById('history-detail');

    if (!c) {
        detail.innerHTML = '<div class="history-empty">재배를 선택해주세요.</div>';
        return;
    }

    var info = buildHistorySummary(c);
    var mushroomLabel = c.mushroomId != null ? '버섯 #' + c.mushroomId : '-';
    var finishedLabel = c.finishedAt ? c.finishedAt.split('T')[0] : '-';

    detail.innerHTML =
        '<div class="history-detail-header">' +
        '<div>' +
        '<div class="history-detail-title">' + c.name + ' · ' + mushroomLabel + '</div>' +
        '<div class="history-detail-period">종료일 ' + finishedLabel + '</div>' +
        '</div>' +
        '<span class="history-badge">종료됨</span>' +
        '</div>' +
        '<div class="env-stat-grid">' +
        '<div class="env-stat-item"><i data-lucide="package" class="env-stat-icon"></i><span class="env-stat-label">총 재배량</span><span class="env-stat-value">' + c.amount + 'g</span></div>' +
        '<div class="env-stat-item"><i data-lucide="award" class="env-stat-icon"></i><span class="env-stat-label">상품 등급</span><span class="env-stat-value">' + (c.grade || '-') + '</span></div>' +
        '<div class="env-stat-item"><i data-lucide="shield-alert" class="env-stat-icon"></i><span class="env-stat-label">병충해 감지일</span><span class="env-stat-value">' + info.pestDays + '일</span></div>' +
        '</div>' +
        '<p class="history-summary">' +
        '<i data-lucide="sparkles" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;color:var(--sage-600);"></i>' +
        info.summary + '</p>' +
        '<button class="btn btn-primary history-compare-btn" type="button" onclick="openCompareModal()">비교하기</button>';

    lucide.createIcons();
}

function openCompareModal() {
    var select = document.getElementById('compare-target-select');
    select.innerHTML = CULTIVATION_HISTORY
        .filter(function (c) { return c.id !== historyState.selectedId; })
        .map(function (c) { return '<option value="' + c.id + '">' + c.name + ' (' + (c.finishedAt ? c.finishedAt.split('T')[0] : '-') + ')</option>'; })
        .join('');

    renderCompareRows();
    openModal('modal-compare');
}

function buildCompareRow(label, currentValue, targetValue, unit) {
    var diff = currentValue - targetValue;
    var diffClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'flat');
    var diffText = diff === 0 ? '선택한 재배와 동일' :
        (diff > 0 ? '▲ +' + diff + unit + ' 더 많음' : '▼ ' + diff + unit + ' 더 적음');

    return '<div class="compare-row">' +
        '<span class="compare-label">' + label + '</span>' +
        '<span class="compare-current">' + currentValue + unit + '</span>' +
        '<span class="compare-avg">비교 대상 ' + targetValue + unit + '</span>' +
        '<span class="compare-diff ' + diffClass + '">' + diffText + '</span>' +
        '</div>';
}

function renderCompareRows() {
    var current = findCultivation(historyState.selectedId);
    var targetId = Number(document.getElementById('compare-target-select').value);
    var target = findCultivation(targetId);

    if (!current || !target) {
        document.getElementById('compare-rows').innerHTML = '';
        return;
    }

    document.getElementById('compare-rows').innerHTML =
        buildCompareRow('총 재배량', current.amount, target.amount, 'g');
}

lucide.createIcons();
historyState.selectedId = CULTIVATION_HISTORY.length > 0 ? CULTIVATION_HISTORY[0].id : null;
renderHistorySidebar();
renderHistoryDetail(historyState.selectedId);
