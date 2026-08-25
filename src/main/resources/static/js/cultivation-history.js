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
    // hashSeed는 >>> 0으로 부호 없는 32비트 값을 반환하지만, 그 값이 2^31을 넘으면(최상위 비트가 1)
    // 이후 비트 연산(>>)에서 JS가 피연산자를 다시 부호 있는 32비트로 취급해 음수가 튀어나옴
    // (예: 병충해 감지일이 "-2일"로 표시되던 버그) -> 부호 없는 시프트(>>>)로 통일
    var avgTemp = 17 + (seed % 6);
    var avgHumidity = 52 + ((seed >>> 3) % 18);
    var pestDays = (seed >>> 12) % 3;

    // c.amount가 없는(수확량을 기록하지 않고 종료된) 재배도 있을 수 있어서, 그냥 이어붙이면
    // 문자열 "null"이 그대로 노출됨("총 nullg을 수확했어요") — 없을 때는 문장 자체를 다르게 구성
    var amountText = c.amount != null ? '총 ' + c.amount + 'g을 수확했어요. ' : '수확량 기록이 없어요. ';

    var summary =
        amountText +
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
    // 기준정보 목록에서 이름을 못 찾은 경우(참조 데이터 누락 등)를 대비해 "버섯 #id"로 폴백
    var mushroomLabel = c.mushroomName || (c.mushroomId != null ? '버섯 #' + c.mushroomId : '-');
    var finishedLabel = c.finishedAt ? c.finishedAt.split('T')[0] : '-';

    detail.innerHTML =
        '<div class="history-detail-header">' +
        '<div>' +
        '<div class="history-detail-title">' + c.name + ' · ' + mushroomLabel + '</div>' +
        '<div class="history-detail-period"><i data-lucide="calendar-days"></i>종료일 ' + finishedLabel + '</div>' +
        '</div>' +
        '<span class="history-badge">종료됨</span>' +
        '</div>' +
        '<div class="env-stat-grid">' +
        '<div class="env-stat-item"><div class="env-stat-icon-wrap"><i data-lucide="package" class="env-stat-icon"></i></div><span class="env-stat-label">총 재배량</span><span class="env-stat-value">' + (c.amount != null ? c.amount + 'g' : '-') + '</span></div>' +
        '<div class="env-stat-item"><div class="env-stat-icon-wrap"><i data-lucide="crown" class="env-stat-icon"></i></div><span class="env-stat-label">상품 등급</span><span class="env-stat-value">' + (c.grade || '-') + '</span></div>' +
        '<div class="env-stat-item"><div class="env-stat-icon-wrap"><i data-lucide="shield-alert" class="env-stat-icon"></i></div><span class="env-stat-label">병충해 감지일</span><span class="env-stat-value">' + info.pestDays + '일</span></div>' +
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
    // 수확량을 기록 안 하고 종료된 재배는 amount가 null일 수 있어서, 그대로 빼면 "nullg"이 찍히고
    // null을 숫자 연산에 섞으면(null이 0으로 취급됨) 비교 결과도 왜곡됨 — 둘 중 하나라도 없으면
    // 숫자 비교 자체를 하지 않고 "비교할 수 없음"으로 표시
    var currentText = currentValue != null ? currentValue + unit : '-';
    var targetText = targetValue != null ? targetValue + unit : '-';
    var diffClass = 'flat';
    var diffText = '비교할 수 없음';

    if (currentValue != null && targetValue != null) {
        var diff = currentValue - targetValue;
        diffClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'flat');
        diffText = diff === 0 ? '선택한 재배와 동일' :
            (diff > 0 ? '▲ +' + diff + unit + ' 더 많음' : '▼ ' + diff + unit + ' 더 적음');
    }

    return '<div class="compare-row">' +
        '<span class="compare-label">' + label + '</span>' +
        '<span class="compare-current">' + currentText + '</span>' +
        '<span class="compare-avg">비교 대상 ' + targetText + '</span>' +
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
