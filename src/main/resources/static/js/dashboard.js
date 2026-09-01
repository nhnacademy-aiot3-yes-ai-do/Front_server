lucide.createIcons();

var CANONICAL_SENSOR_TYPES = ['TEMPERATURE', 'HUMIDITY', 'CO2', 'LIGHT'];
// 기본 4종은 전용 아이콘이 있고, 관리자가 나중에 새로 등록한 커스텀 타입(TEST1 등)은
// 아이콘이 없어서 공통 아이콘(cpu)으로 대체함
var SENSOR_TYPE_ICONS = { TEMPERATURE: 'thermometer', HUMIDITY: 'droplet', CO2: 'cloudy', LIGHT: 'sun' };
var SENSOR_TYPE_ICON_FALLBACK = 'cpu';
var SENSOR_DEVICES_BY_TYPE = {};
var LATEST_VALUES = {};

// 카드로 보여줄 센서 타입 순서: 기본 4종(등록된 기기가 없어도 항상 표시) + 이 재배지에
// 실제로 값이 있는 그 외 타입(관리자 페이지에서 새로 만든 커스텀 타입 등, 이름 순 정렬)
function sensorTypeDisplayOrder() {
    var extras = Object.keys(SENSOR_DEVICES_BY_TYPE)
        .filter(function (t) {
            return CANONICAL_SENSOR_TYPES.indexOf(t) === -1 && SENSOR_DEVICES_BY_TYPE[t].length > 0;
        })
        .sort();
    return CANONICAL_SENSOR_TYPES.concat(extras);
}

function latestSensorValuesOf(payload) {
    return payload && Array.isArray(payload.latestSensorValueResponses)
        ? payload.latestSensorValueResponses
        : [];
}

function initializeSensorBootstrap() {
    var sensorsRes = SENSORS_BOOTSTRAP || { sensors: [] };
    var latestList = latestSensorValuesOf(SENSOR_VALUES_BOOTSTRAP);

    SENSOR_DEVICES_BY_TYPE = {};
    CANONICAL_SENSOR_TYPES.forEach(function (t) { SENSOR_DEVICES_BY_TYPE[t] = []; });
    (sensorsRes.sensors || []).forEach(function (s) {
        (s.sensorTypes || []).forEach(function (t) {
            if (!SENSOR_DEVICES_BY_TYPE[t.type]) SENSOR_DEVICES_BY_TYPE[t.type] = [];
            SENSOR_DEVICES_BY_TYPE[t.type].push({ deviceEui: s.deviceEui, deviceName: s.deviceName });
        });
    });

    LATEST_VALUES = {};
    (latestList || []).forEach(function (v) {
        LATEST_VALUES[v.sensorType + '|' + v.deviceEui] = { value: v.value, unit: v.unit };
    });

    renderSensorPanel();
    renderMainEnvStats();
    populateChartSensorSelect();
}

function formatSensorValue(entry) {
    if (!entry || entry.value == null) return '-';
    return entry.value + (entry.unit || '');
}

// 센서 카드 하나(아이콘 + 타입 코드 라벨 + 기기 선택 드롭다운 + 최신값)의 마크업을 만듦.
// 예전엔 main.html에 4개 타입 카드가 하드코딩돼 있었는데, 관리자 페이지에서 센서 타입을
// 새로 등록해도 반영이 안 돼서(항상 4개만 뜸) 이렇게 JS에서 타입 목록 기준으로 직접 그리도록 바꿈.
function sensorRowHtml(type) {
    var icon = SENSOR_TYPE_ICONS[type] || SENSOR_TYPE_ICON_FALLBACK;
    // msh-select.js는 페이지 로드 시 딱 한 번만 돌면서 그 시점에 이미 있는 .msh-select에
    // id를 붙이고 menu에 data-owner를 매칭해줌(closeMshSelect가 이 id로 menu를 다시 찾음).
    // 이 카드들은 그 이후에 JS로 새로 만들어지는 거라 가만히 두면 id/data-owner가 없어서
    // 드롭다운을 열 순 있어도 닫을 때 menu를 못 찾아 body에 붙은 채로 안 닫힘 -> 여기서 직접 지정.
    var selectId = 'msh-select-sensor-' + type;
    return '<div class="card sensor-row" data-sensor-type="' + type + '">' +
        '<i data-lucide="' + icon + '" class="sensor-icon"></i>' +
        '<div class="sensor-main">' +
        '<div class="sensor-row-type">' + escapeHtml(type) + '</div>' +
        '<div class="msh-select msh-select--sensor" id="' + selectId + '" data-value="" data-onchange="updateSensor" data-onchange-arg="' + type + '">' +
        '<button type="button" class="msh-select-trigger" onclick="toggleMshSelect(this.parentElement)">' +
        '<span class="msh-select-value">등록된 센서 없음</span>' +
        '<i data-lucide="chevron-down" class="msh-select-chevron"></i>' +
        '</button>' +
        '<div class="msh-select-menu" data-owner="' + selectId + '"></div>' +
        '</div>' +
        '<div class="sensor-value">-</div>' +
        '</div>' +
        '</div>';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderSensorPanel() {
    var container = document.getElementById('sensor-rows');
    if (!container) return;

    container.innerHTML = sensorTypeDisplayOrder().map(sensorRowHtml).join('');
    lucide.createIcons();

    container.querySelectorAll('.sensor-row[data-sensor-type]').forEach(function (row) {
        var type = row.dataset.sensorType;
        var devices = SENSOR_DEVICES_BY_TYPE[type] || [];
        var wrapperEl = row.querySelector('.msh-select--sensor');
        var menu = wrapperEl.querySelector('.msh-select-menu');
        var valueEl = row.querySelector('.sensor-value');

        if (devices.length === 0) {
            menu.innerHTML = '';
            wrapperEl.dataset.value = '';
            wrapperEl.querySelector('.msh-select-value').textContent = '등록된 센서 없음';
            valueEl.textContent = '-';
            return;
        }

        menu.innerHTML = devices.map(function (d) {
            return '<div class="msh-select-option" data-value="' + d.deviceEui + '" onclick="selectMshOption(this)">' + d.deviceName + '</div>';
        }).join('');

        var first = devices[0];
        wrapperEl.dataset.value = first.deviceEui;
        wrapperEl.querySelector('.msh-select-value').textContent = first.deviceName;
        menu.querySelector('.msh-select-option').classList.add('selected');
        valueEl.textContent = formatSensorValue(LATEST_VALUES[type + '|' + first.deviceEui]);
    });

    capSensorRowsHeight(container);
}

// rem으로 대충 높이를 잡으면 카드 5번째가 어중간하게 잘려 보여서(스크롤 힌트치곤 애매함),
// 실제 카드 1개 높이를 재서 "정확히 4장 + 그 사이 간격"만큼만 보이게 자름.
// 카드가 4장 이하면 스크롤이 필요 없으니 그냥 자연스러운 높이로 둠.
function capSensorRowsHeight(container) {
    var rows = container.querySelectorAll('.sensor-row');
    if (rows.length <= 4) {
        container.style.maxHeight = '';
        return;
    }
    // gap을 따로 계산해서 더하면(rowGap 계산이 안 먹는 경우 등) 오차가 생겨 4번째 카드가
    // 어중간하게 잘릴 수 있어서, 대신 "4번째 카드의 실제 아래쪽 끝"까지 거리를 직접 재서 씀 -> 오차 없음.
    container.style.maxHeight = 'none';
    var containerTop = container.getBoundingClientRect().top;
    var fourthRowBottom = rows[3].getBoundingClientRect().bottom;
    container.style.maxHeight = (fourthRowBottom - containerTop) + 'px';
}

// 메인 탭 "환경 통계" 카드: 센서 타입별 첫 번째 기기의 최신 측정값을 그대로 보여줌.
// (renderSensorPanel과 동일한 LATEST_VALUES를 재사용, 없으면 "-")
var MAIN_ENV_STAT_IDS = {
    TEMPERATURE: 'main-env-stat-temp',
    HUMIDITY: 'main-env-stat-humidity',
    CO2: 'main-env-stat-co2',
    LIGHT: 'main-env-stat-light'
};

function renderMainEnvStats() {
    Object.keys(MAIN_ENV_STAT_IDS).forEach(function (type) {
        var el = document.getElementById(MAIN_ENV_STAT_IDS[type]);
        if (!el) return;
        var devices = SENSOR_DEVICES_BY_TYPE[type] || [];
        var first = devices[0];
        el.textContent = first ? formatSensorValue(LATEST_VALUES[type + '|' + first.deviceEui]) : '-';
    });
}

function updateSensor(wrapperEl, optionEl, sensorType) {
    var valueEl = wrapperEl.closest('.sensor-main').querySelector('.sensor-value');
    var deviceEui = wrapperEl.dataset.value;
    valueEl.textContent = formatSensorValue(LATEST_VALUES[sensorType + '|' + deviceEui]);
}
var SENSOR_TYPE_LABELS = { TEMPERATURE: '온도', HUMIDITY: '습도', CO2: 'CO2', LIGHT: '조도' };
var CHART_SELECTED = null;      // { sensorType, deviceEui }
var CHART_STORE = {};           // 센서별(키: "타입|deviceEui") 실시간 값 버퍼 — 다른 센서로 바꿨다가 돌아와도
                                 // 그동안 백그라운드 폴링으로 쌓인 값이 남아있어서 그래프가 새로 시작되지 않고 이어짐
var CHART_HISTORY = [];         // 현재 선택된 센서의 버퍼(CHART_STORE[key].history)를 가리키는 참조
var CHART_TIMES = [];           // CHART_HISTORY와 같은 길이로 유지되는 타임스탬프(ms) 배열
var CHART_UNIT = '';            // 현재 선택된 센서의 단위 (°C, %, ppm, lux 등 — 센서마다 다름)
var CHART_MAX_POINTS = 3000;    // 버퍼 하나당 안전장치용 개수 상한
var CHART_RETENTION_MS = 24 * 60 * 60 * 1000; // 버퍼 자체는 최대 24시간치까지 보관 (화면엔 아래 실시간 구간만 표시)
var CHART_POLL_INTERVAL_MS = 3000; // 3초마다 최신값 폴링
var CHART_DISPLAY_WINDOW_MS = 1 * 60 * 1000; // 화면엔 항상 최근 1분만 — 3초 폴링 간격 대비 창이 짧아야 중간 지점 타임스탬프가 보임
var chartPollTimer = null;

function chartKey(sensorType, deviceEui) {
    return sensorType + '|' + deviceEui;
}

function getChartBucket(key) {
    if (!CHART_STORE[key]) {
        CHART_STORE[key] = { history: [], times: [], unit: '' };
    }
    return CHART_STORE[key];
}

// 버퍼 하나(history/times 쌍)에 24시간 보관 + 개수 상한만 적용 (화면 표시 구간은 항상 최근 2분 고정)
function trimChartBucket(bucket) {
    if (bucket.times.length === 0) return;
    var cutoff = Date.now() - CHART_RETENTION_MS;
    while (bucket.times.length > 1 && bucket.times[0] < cutoff) {
        bucket.times.shift();
        bucket.history.shift();
    }
    if (bucket.history.length > CHART_MAX_POINTS) {
        var excess = bucket.history.length - CHART_MAX_POINTS;
        bucket.history.splice(0, excess);
        bucket.times.splice(0, excess);
    }
}

function getWindowedChartData() {
    var cutoff = Date.now() - CHART_DISPLAY_WINDOW_MS;
    var values = [];
    var times = [];
    for (var i = 0; i < CHART_TIMES.length; i++) {
        if (CHART_TIMES[i] >= cutoff) {
            values.push(CHART_HISTORY[i]);
            times.push(CHART_TIMES[i]);
        }
    }
    return { values: values, times: times };
}

function populateChartSensorSelect() {
    var wrapperEl = document.getElementById('chart-sensor-select');
    var menu = wrapperEl.querySelector('.msh-select-menu');
    var valueLabel = wrapperEl.querySelector('.msh-select-value');

    var groupsHtml = '';
    var firstOption = null;
    sensorTypeDisplayOrder().forEach(function (type) {
        var devices = SENSOR_DEVICES_BY_TYPE[type] || [];
        if (devices.length === 0) return;
        groupsHtml += '<div class="msh-select-group-label">' + (SENSOR_TYPE_LABELS[type] || type) + '</div>';
        devices.forEach(function (d) {
            var optValue = type + '|' + d.deviceEui;
            groupsHtml += '<div class="msh-select-option" data-value="' + optValue + '" onclick="selectMshOption(this)">' + d.deviceName + '</div>';
            if (!firstOption) firstOption = { type: type, deviceEui: d.deviceEui, deviceName: d.deviceName };
        });
    });

    menu.innerHTML = groupsHtml;

    if (!firstOption) {
        wrapperEl.dataset.value = '';
        valueLabel.textContent = '등록된 센서 없음';
        stopChartPolling();
        renderChartEmpty('등록된 센서가 없습니다');
        return;
    }

    var optValue = firstOption.type + '|' + firstOption.deviceEui;
    wrapperEl.dataset.value = optValue;
    valueLabel.textContent = firstOption.deviceName;
    var firstOptionEl = menu.querySelector('.msh-select-option[data-value="' + optValue + '"]');
    if (firstOptionEl) firstOptionEl.classList.add('selected');

    selectChartSensor(firstOption.type, firstOption.deviceEui);
}

function handleChartSensorChange(wrapperEl) {
    var parts = (wrapperEl.dataset.value || '').split('|');
    if (parts.length !== 2) return;
    selectChartSensor(parts[0], parts[1]);
}

// (B안 실험) 기존 24시간/15분-평균 추이 API를 그대로 써서, 버퍼가 비어있을 때(=처음 보는 센서이거나
// 새로고침 직후)만 그 값으로 미리 채워둠. 15분 평균값이라 최근 15분 창 안엔 많아야 1~2개 점만 들어오고,
// 그마저도 평균값이라 실측치와는 다를 수 있음 — 어떻게 보이는지 확인해보기 위한 실험.
function fetchSensorTrend(sensorType, deviceEui) {
    var url = '/cultivations/' + CULTIVATION_ID + '/sensor-values/trend'
        + '?device-eui=' + encodeURIComponent(deviceEui)
        + '&sensor-type=' + encodeURIComponent(sensorType);
    return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('sensor trend request failed: ' + res.status);
        return res.json();
    });
}

function sortChartBucket(bucket) {
    var paired = bucket.times.map(function (t, i) { return { t: t, v: bucket.history[i] }; });
    paired.sort(function (a, b) { return a.t - b.t; });
    bucket.times = paired.map(function (p) { return p.t; });
    bucket.history = paired.map(function (p) { return p.v; });
}

function finishSelectingChart(bucket) {
    CHART_HISTORY = bucket.history;
    CHART_TIMES = bucket.times;
    CHART_UNIT = bucket.unit || CHART_UNIT;
    if (CHART_HISTORY.length > 0) {
        renderChartTrend();
    } else {
        renderChartEmpty('아직 수신된 값이 없습니다');
    }
}

function selectChartSensor(sensorType, deviceEui) {
    CHART_SELECTED = { sensorType: sensorType, deviceEui: deviceEui };
    var key = chartKey(sensorType, deviceEui);
    var bucket = getChartBucket(key);
    var latestEntry = LATEST_VALUES[key];
    CHART_UNIT = bucket.unit || (latestEntry && latestEntry.unit) || '';

    // 이미 이 세션에서(폴링을 통해서든, 이전 시드를 통해서든) 값이 쌓여있으면 다시 불러올 필요 없음
    if (bucket.history.length > 0) {
        CHART_HISTORY = bucket.history;
        CHART_TIMES = bucket.times;
        renderChartTrend();
        startChartPolling();
        return;
    }

    renderChartEmpty('그래프 불러오는 중...');

    fetchSensorTrend(sensorType, deviceEui)
        .then(function (trend) {
            // 응답이 오는 사이에 사용자가 다른 센서로 바꿨으면 그 결과는 무시
            if (!CHART_SELECTED || CHART_SELECTED.sensorType !== sensorType || CHART_SELECTED.deviceEui !== deviceEui) return;

            bucket.unit = (trend && trend.unit) || bucket.unit;
            (trend && trend.responses || []).forEach(function (p) {
                if (p.value == null) return;
                bucket.history.push(p.value);
                bucket.times.push(new Date(p.measuredAt).getTime());
            });

            if (bucket.history.length === 0 && latestEntry && latestEntry.value != null) {
                bucket.history.push(latestEntry.value);
                bucket.times.push(Date.now());
                bucket.unit = latestEntry.unit || bucket.unit;
            }

            // 응답을 기다리는 사이에 폴링이 먼저 값을 넣었을 수도 있어서(드물지만), 시간순으로 다시 정렬
            sortChartBucket(bucket);
            trimChartBucket(bucket);
            finishSelectingChart(bucket);
        })
        .catch(function () {
            // 조회 실패 시엔 최소한 최신값 1개라도 보여줌 (기존 동작과 동일한 안전망)
            if (!CHART_SELECTED || CHART_SELECTED.sensorType !== sensorType || CHART_SELECTED.deviceEui !== deviceEui) return;
            if (bucket.history.length === 0 && latestEntry && latestEntry.value != null) {
                bucket.history.push(latestEntry.value);
                bucket.times.push(Date.now());
                bucket.unit = latestEntry.unit || bucket.unit;
            }
            finishSelectingChart(bucket);
        });

    startChartPolling();
}

function startChartPolling() {
    if (chartPollTimer) return;
    chartPollTimer = window.setInterval(pollChartValue, CHART_POLL_INTERVAL_MS);
}

function stopChartPolling() {
    if (chartPollTimer) {
        window.clearInterval(chartPollTimer);
        chartPollTimer = null;
    }
}

// 응답엔 등록된 센서 전체의 최신값이 같이 내려오므로, 지금 화면에 보이는 센서뿐 아니라
// 모든 센서의 버퍼를 같이 채워둠 — 나중에 다른 센서로 바꿔도 끊김 없이 이어지게 하기 위함
function pollChartValue() {
    if (!CHART_SELECTED) return;
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var gatewayOrigin = isLocal ? 'http://localhost:8080' : 'https://api.yes-nhn.site';

    fetch(gatewayOrigin + '/api/v1/cultivations/' + CULTIVATION_ID + '/sensor-values', {
        credentials: 'include'
    })
        .then(function (res) {
            if (res.status === 401) {
                stopChartPolling();
                logout();
                return null;
            }
            if (!res.ok) {
                throw new Error('sensor-values request failed: ' + res.status);
            }
            return res.json();
        })
        .then(function (payload) {
            if (!payload || !CHART_SELECTED) return;

            var now = Date.now();
            latestSensorValuesOf(payload).forEach(function (v) {
                var key = chartKey(v.sensorType, v.deviceEui);
                if (v.value == null) return;

                var bucket = getChartBucket(key);
                if (!bucket.unit) {
                    bucket.unit = v.unit;
                }
                if (v.unit === bucket.unit) {
                    LATEST_VALUES[key] = { value: v.value, unit: v.unit };
                    bucket.history.push(v.value);
                    bucket.times.push(now);
                    trimChartBucket(bucket);
                }
            });
            updateVisibleSensorValues();

            var selectedKey = chartKey(CHART_SELECTED.sensorType, CHART_SELECTED.deviceEui);
            var selectedBucket = CHART_STORE[selectedKey];
            if (selectedBucket) {
                CHART_HISTORY = selectedBucket.history;
                CHART_TIMES = selectedBucket.times;
                CHART_UNIT = selectedBucket.unit || CHART_UNIT;
                renderChartTrend();
            }
        })
        .catch(function () {
            // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
        });
}

// 상단 센서 카드 값도 같은 폴링 결과로 같이 갱신 (덤)
function updateVisibleSensorValues() {
    document.querySelectorAll('.sensor-row[data-sensor-type]').forEach(function (row) {
        var type = row.dataset.sensorType;
        var wrapperEl = row.querySelector('.msh-select--sensor');
        var valueEl = row.querySelector('.sensor-value');
        var deviceEui = wrapperEl.dataset.value;
        if (!deviceEui) return;
        valueEl.textContent = formatSensorValue(LATEST_VALUES[type + '|' + deviceEui]);
    });
    renderMainEnvStats();
}

function renderChartEmpty(message) {
    var svg = document.getElementById('chart-svg');
    if (svg) {
        svg.setAttribute('viewBox', '0 0 300 112');
        svg.innerHTML = '';
    }
    var emptyEl = document.getElementById('chart-empty-msg');
    if (emptyEl) {
        emptyEl.textContent = message;
        emptyEl.style.display = 'flex';
    }
}

// 그래프 좌/아래에 눈금(값/시간)을 그릴 여백을 뺀 실제 그래프 영역
var CHART_PLOT_X0 = 34;
var CHART_PLOT_X1 = 296;
var CHART_PLOT_Y0 = 8;
var CHART_PLOT_Y1 = 92;

function formatChartValue(v) {
    var rounded = Math.round(v * 10) / 10;
    return rounded + (CHART_UNIT || '');
}

function formatChartTime(ts) {
    var d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
}

function renderChartTrend() {
    var windowed = getWindowedChartData();
    var values = windowed.values;
    var times = windowed.times;

    var emptyEl = document.getElementById('chart-empty-msg');
    if (!values || values.length === 0) {
        renderChartEmpty('이 구간엔 아직 값이 없습니다');
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    var range = maxVal - minVal;
    var plotHeight = CHART_PLOT_Y1 - CHART_PLOT_Y0;
    var plotWidth = CHART_PLOT_X1 - CHART_PLOT_X0;

    function scaleY(v) {
        if (range === 0) return CHART_PLOT_Y0 + plotHeight / 2;
        return CHART_PLOT_Y1 - ((v - minVal) / range) * plotHeight;
    }

    var n = values.length;

    // x축은 "몇 번째 점이냐"가 아니라 실제 경과 시간 비율로 배치해야 함 —
    // 히스토리는 점이 드문드문(15분 간격)인데 실시간 폴링은 3초마다 점이 계속 쌓이므로,
    // 인덱스 기준으로 간격을 나누면 과거 데이터가 왼쪽에 눌려붙고 최근 값만 그래프 대부분을 차지해 왜곡돼 보임.
    var t0 = times[0];
    var t1 = times[n - 1];
    var timeRange = t1 - t0;

    var coords = values.map(function (v, i) {
        var x;
        if (n === 1 || timeRange <= 0) {
            x = n === 1 ? (CHART_PLOT_X0 + plotWidth / 2) : (CHART_PLOT_X0 + i * (plotWidth / (n - 1)));
        } else {
            x = CHART_PLOT_X0 + ((times[i] - t0) / timeRange) * plotWidth;
        }
        return { x: x, y: scaleY(v) };
    });

    var linePoints = coords.map(function (c) { return c.x + ',' + c.y; }).join(' ');
    var polygonPoints = linePoints + ' ' + coords[coords.length - 1].x + ',' + CHART_PLOT_Y1 + ' ' + coords[0].x + ',' + CHART_PLOT_Y1;
    var last = coords[coords.length - 1];

    // ---- Y축(값) 눈금: 위/가운데/아래 3줄, 센서마다 단위가 달라서 CHART_UNIT을 그대로 붙여줌 ----
    var gridRows = [
        { y: CHART_PLOT_Y0, value: range === 0 ? values[0] : maxVal },
        { y: CHART_PLOT_Y0 + plotHeight / 2, value: range === 0 ? values[0] : (minVal + maxVal) / 2 },
        { y: CHART_PLOT_Y1, value: range === 0 ? values[0] : minVal }
    ];
    var gridLinesHtml = gridRows.map(function (row) {
        return '<polyline class="chart-grid-line" points="' + CHART_PLOT_X0 + ',' + row.y + ' ' + CHART_PLOT_X1 + ',' + row.y + '" />' +
            '<text class="chart-axis-label chart-axis-label-y" x="' + (CHART_PLOT_X0 - 5) + '" y="' + (row.y + 3) + '" text-anchor="end">' + formatChartValue(row.value) + '</text>';
    }).join('');

    // ---- X축(시간) 눈금: 눕히지 않고 가로로, 폭이 부족하면 중간 점 라벨은 건너뜀 ----
    // 마지막(최신) 라벨부터 왼쪽으로 훑으면서 라벨 폭(minLabelGap)만큼 떨어진 점에서만 라벨 추가
    var timeLabelsHtml = '';
    if (n >= 2) {
        var minLabelGap = 30;
        var timeRows = [];
        var lastLabelX = null;

        for (var li = n - 1; li >= 0; li--) {
            var x = coords[li].x;
            if (lastLabelX === null || (lastLabelX - x) >= minLabelGap) {
                var anchor = li === 0 ? 'start' : (li === n - 1 ? 'end' : 'middle');
                timeRows.unshift({ x: x, t: times[li], anchor: anchor });
                lastLabelX = x;
            }
        }

        timeLabelsHtml = timeRows.map(function (row) {
            return '<text class="chart-axis-label chart-axis-label-x" x="' + row.x + '" y="' + (CHART_PLOT_Y1 + 12) + '" text-anchor="' + row.anchor + '">' + formatChartTime(row.t) + '</text>';
        }).join('');
    }

    var svg = document.getElementById('chart-svg');
    svg.setAttribute('viewBox', '0 0 300 112');
    svg.innerHTML =
        '<defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="var(--sage-500)" stop-opacity="0.35" />' +
        '<stop offset="100%" stop-color="var(--sage-500)" stop-opacity="0" /></linearGradient></defs>' +
        gridLinesHtml +
        '<polygon fill="url(#chartFill)" points="' + polygonPoints + '" />' +
        '<polyline class="chart-demo-line" fill="none" points="' + linePoints + '" />' +
        '<circle class="chart-demo-dot" cx="' + last.x + '" cy="' + last.y + '" r="4.5" />' +
        timeLabelsHtml;
}
// 커스텀 드롭다운(.msh-select) 관련 공통 로직은 /js/msh-select.js로 옮겼음 (관리자 페이지랑 같이 씀).

// AI 챗봇 답변을 생성해줄 백엔드가 아직 없어서(Ai_server에 대화형 엔드포인트 없음),
// 그럴듯한 답변을 무작위로 지어내던 CHATBOT_REPLIES는 없애고 항상 같은 안내 문구만 보냄.
var CHATBOT_PLACEHOLDER_REPLY = 'AI 챗봇은 아직 준비 중인 기능이에요. 조금만 기다려 주세요 🍄';

// 인사이트: Ai_server에 서비스/DB 로직(InsightService 등)은 이미 있는데 이걸 밖에서 부를 수
// 있는 컨트롤러(API)가 아직 없어서, 지금은 modal-insight에 "내 인사이트" + "비슷한 재배자 인사이트 5개"
// 자리(프레임)만 잡아둠. 실제 데이터 없이 골격만 있는 상태라 버튼은 openModal('modal-insight')로 바로 연결.
// API가 생기면 openModal 앞뒤로 fetch 붙여서 #insight-my-card / #insight-similar-list를 채우면 됨.

var CURRENT_CONVERSATION_ID = null;

function loadChatHistory() {
    if (typeof CULTIVATION_ID === 'undefined' || !CULTIVATION_ID) return;

    fetch('/api/chat/history?cultivationId=' + CULTIVATION_ID)
        .then(function(res) { return res.json(); })
        .then(function(res) {
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                var list = document.getElementById('chatbot-messages');
                list.innerHTML = '<div class="chat-message bot"><img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble">안녕하세요! 재배와 관련된 질문을 편하게 남겨주세요.</div></div>';

                res.data.forEach(function(msg) {
                    var msgEl = document.createElement('div');
                    msgEl.className = msg.role === 'USER' ? 'chat-message user' : 'chat-message bot';
                    if (msg.role === 'USER') {
                        msgEl.innerHTML = '<div class="chat-bubble"></div>';
                    } else {
                        msgEl.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble" style="white-space: pre-wrap;"></div>';
                    }
                    msgEl.querySelector('.chat-bubble').textContent = msg.content;
                    list.appendChild(msgEl);
                });
                list.scrollTop = list.scrollHeight;
            }
        })
        .catch(function(err) {
            console.error('대화 내역 불러오기 실패:', err);
        });
}

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

    var loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message bot';
    loadingMsg.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble">답변을 생각하고 있어요...</div>';
    list.appendChild(loadingMsg);
    list.scrollTop = list.scrollHeight;

    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            conversationId: CURRENT_CONVERSATION_ID,
            cultivationId: (typeof CULTIVATION_ID !== 'undefined' && CULTIVATION_ID > 0) ? CULTIVATION_ID : null,
            message: text,
            channelId: 1
        })
    })
        .then(function(res) { return res.json(); })
        .then(function(res) {
            if (loadingMsg.parentNode) {
                list.removeChild(loadingMsg);
            }
            if (res && res.success && res.data) {
                CURRENT_CONVERSATION_ID = res.data.conversationId;
                var botMsg = document.createElement('div');
                botMsg.className = 'chat-message bot';
                botMsg.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble" style="white-space: pre-wrap;"></div>';
                botMsg.querySelector('.chat-bubble').textContent = res.data.reply;
                list.appendChild(botMsg);
            } else {
                var errBubble = document.createElement('div');
                errBubble.className = 'chat-message bot';
                errBubble.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble">일시적으로 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
                list.appendChild(errBubble);
            }
            list.scrollTop = list.scrollHeight;
        })
        .catch(function(err) {
            if (loadingMsg.parentNode) {
                list.removeChild(loadingMsg);
            }
            console.error('챗봇 통신 실패:', err);
        });
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

    // 챗봇 탭 클릭 시 이전 대화 내역 불러오기
    if (name === 'chatbot') {
        loadChatHistory();
    }
}

function togglePanel(id) {
    var panel = document.getElementById(id);
    var isOpen = panel.classList.contains('is-open');
    document.querySelectorAll('.dropdown-panel').forEach(function (p) {
        p.classList.remove('is-open');
    });
    // 모달이 열려있는 채로 알림/담당자 패널을 열면 반투명 모달 배경 뒤로 패널이 비쳐 보여서 같이 닫아줌
    document.querySelectorAll('.modal-overlay.is-open').forEach(function (m) {
        m.classList.remove('is-open');
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

// 알림 목록 — Front BFF(/notifications) → Gateway → notification-server
var NOTIF_PAGE_SIZE = 5;
var notifState = { page: 0, totalPages: 1, hasNext: false, loading: false };

function renderNotifPanel() {
    loadNotifPage(notifState.page);
}

function loadNotifPage(page) {
    if (notifState.loading) return;
    notifState.loading = true;

    var list = document.getElementById('notif-list');
    if (list) {
        list.innerHTML = '<div class="notif-row">불러오는 중...</div>';
    }

    fetch('/notifications?page=' + page + '&size=' + NOTIF_PAGE_SIZE, {
        credentials: 'same-origin'
    })
        .then(function (res) {
            if (res.redirected || res.status === 401 || res.status === 403) {
                throw new Error('unauthorized');
            }
            if (!res.ok) {
                throw new Error('http_' + res.status);
            }
            return res.json();
        })
        .then(function (data) {
            notifState.page = typeof data.page === 'number' ? data.page : page;
            notifState.totalPages = Math.max(1, data.totalPages || 1);
            notifState.hasNext = !!data.hasNext;
            renderNotifRows(data.content || []);
            updateNotifPagination();
        })
        .catch(function () {
            if (list) {
                list.innerHTML = '<div class="notif-row">알림을 불러오지 못했습니다.</div>';
            }
            notifState.totalPages = 1;
            notifState.hasNext = false;
            updateNotifPagination();
        })
        .finally(function () {
            notifState.loading = false;
        });
}

function renderNotifRows(items) {
    var list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = '';

    if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'notif-row';
        empty.textContent = '알림이 없습니다.';
        list.appendChild(empty);
        return;
    }

    items.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'notif-row';
        row.textContent = item.message || '(메시지 없음)';
        list.appendChild(row);
    });
}

function updateNotifPagination() {
    var totalPages = Math.max(1, notifState.totalPages || 1);
    var pageLabel = document.getElementById('notif-page-label');
    if (pageLabel) {
        pageLabel.textContent = (notifState.page + 1) + ' / ' + totalPages;
    }

    var pagination = document.getElementById('notif-pagination');
    if (pagination) {
        pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
    }
    var prev = document.getElementById('notif-prev');
    var next = document.getElementById('notif-next');
    if (prev) prev.disabled = notifState.page === 0 || notifState.loading;
    if (next) next.disabled = notifState.page >= totalPages - 1 || notifState.loading;
}

function changeNotifPage(delta) {
    var nextPage = notifState.page + delta;
    if (nextPage < 0 || nextPage >= Math.max(1, notifState.totalPages)) return;
    loadNotifPage(nextPage);
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
        .then(function (res) {
            if (!res.ok) throw new Error('member refresh failed');
            return res.json();
        })
        .then(function (payload) {
            memberData = payload && Array.isArray(payload.memberResponses)
                ? payload.memberResponses
                : [];
            renderMemberPanel();
        })
        .catch(function () {
            // 현재 화면의 멤버 목록을 유지하고 다음 새로고침에서 재시도한다.
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

function handleMemberSearchKeydown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    searchMemberCandidates();
}

function searchMemberCandidates() {
    var query = document.getElementById('member-search-input').value.trim();
    var resultsEl = document.getElementById('member-search-results');

    if (!query) {
        resultsEl.innerHTML = '<div class="member-search-hint">이메일 전체 또는 닉네임 일부를 입력 후 Enter</div>';
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

// AI report 탭: Ai_server에 일자별 리포트를 만들어주는 API가 아직 없어서(가이드/센서 임계값
// 검증 엔드포인트만 존재), 날짜 문자열을 해시해서 온도/습도/CO2/조도를 지어내던 기존 코드를
// 걷어냄. 지금은 main.html에서 "준비 중" 안내만 보여줌. 실제 API가 생기면 여기서 fetch해서 채우면 됨.

// 재배량 (재배 종료 시 한 번만 입력, 실제로는 서버에서 받아와야 함)
var harvestState = { totalAmount: 0 };

// ===== 재배 종료 흐름: 최종 재배량 -> AI 재배 리포트 -> 재배 이력 비교 -> 홈 =====

// PAST_CULTIVATIONS는 main.html에서 실제 재배 이력(finished cultivations)을 내려받아 채움 (site.yesaido.frontserver.controller.CultivationController#detail)
var endReportStats = null;

function compareOptionLabel(c) {
    var finishedLabel = c.finishedAt ? c.finishedAt.split('T')[0] : '-';
    var typeLabel = c.mushroomName ? ' · ' + c.mushroomName : '';
    return c.name + typeLabel + ' (' + finishedLabel + ' 종료)';
}

function populateCompareSelect() {
    var fieldEl = document.getElementById('end-compare-field');
    var rowsEl = document.getElementById('end-compare-rows');
    var emptyEl = document.getElementById('end-compare-empty');
    var wrapperEl = document.getElementById('end-compare-select');

    if (!PAST_CULTIVATIONS || PAST_CULTIVATIONS.length === 0) {
        fieldEl.style.display = 'none';
        rowsEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }
    fieldEl.style.display = '';
    rowsEl.style.display = '';
    emptyEl.style.display = 'none';

    var menu = wrapperEl.querySelector('.msh-select-menu');
    menu.innerHTML = PAST_CULTIVATIONS.map(function (c, i) {
        return '<div class="msh-select-option' + (i === 0 ? ' selected' : '') + '" data-value="' + c.id + '" onclick="selectMshOption(this)">' +
            compareOptionLabel(c) + '</div>';
    }).join('');

    var first = PAST_CULTIVATIONS[0];
    wrapperEl.dataset.value = first.id;
    wrapperEl.querySelector('.msh-select-value').textContent = compareOptionLabel(first);
}
populateCompareSelect();

function handleCompareSelectChange() {
    renderEndCompare(endReportStats);
}

function openEndAmountModal() {
    if (CULTIVATION_MODE !== 'HARVEST') {
        alert('먼저 "수확 모드로 전환" 버튼으로 전환한 뒤에 수확을 기록할 수 있어요.');
        return;
    }
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
    var body = JSON.stringify({ harvestWeight: amount, memo: memo });

    function postHarvest() {
        return fetch('/cultivations/' + CULTIVATION_ID + '/harvest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });
    }

    function proceed() {
        harvestState.totalAmount = amount;
        endReportStats = computeEndReportStats();
        renderEndReport(endReportStats);
        amountInput.value = '';
        memoInput.value = '';
        closeModal('modal-end-amount');
        openModal('modal-end-report');
    }

    function retry() {
        return postHarvest()
            .then(function (res) {
                // 재시도에서 409(이미 수확 기록 존재)가 뜨면 직전 요청이 실제로는 성공했다는 뜻이므로 정상 처리한다.
                if (res.ok || res.status === 409) {
                    proceed();
                    return;
                }
                alert('수확 기록에 실패했습니다.');
            })
            .catch(function () {
                alert('수확 기록에 실패했습니다.');
            });
    }

    // 500번대 응답이나 네트워크 단절은 "서버엔 실제로 반영됐는데 응답만 못 받은" 경우일 수 있어 한 번만 조용히
    // 재시도한다. 400/403/404 같은 명확한 클라이언트 에러는 재시도 없이 그대로 신뢰해서 보여준다.
    postHarvest()
        .then(function (res) {
            if (res.ok) {
                proceed();
                return;
            }
            if (res.status >= 500) {
                return retry();
            }
            alert('수확 기록에 실패했습니다.');
        })
        .catch(function () {
            retry();
        });
}

function computeEndReportStats() {
    // 환경 평균/병충해 감지일은 리포트 API가 없어 지어내던 값이라 제거하고,
    // 실제로 서버가 계산해주는 재배 일수(GROWTH_DAYS)와 수확량만 사용함.
    return {
        totalDays: GROWTH_DAYS,
        totalAmount: harvestState.totalAmount
    };
}

function renderEndReport(stats) {
    var grid = document.getElementById('end-report-stat-grid');
    grid.innerHTML =
        '<div class="env-stat-item"><i data-lucide="calendar-days" class="env-stat-icon"></i><span class="env-stat-label">총 재배기간</span><span class="env-stat-value">' + stats.totalDays + '일</span></div>' +
        '<div class="env-stat-item"><i data-lucide="package" class="env-stat-icon"></i><span class="env-stat-label">총 재배량</span><span class="env-stat-value">' + stats.totalAmount + 'g</span></div>';

    document.getElementById('end-report-summary').textContent =
        '총 ' + stats.totalDays + '일 동안 재배해서 총 ' + stats.totalAmount + 'g을 수확했어요.';

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
    if (!PAST_CULTIVATIONS || PAST_CULTIVATIONS.length === 0) return;

    var selectedId = Number(document.getElementById('end-compare-select').dataset.value);
    var target = PAST_CULTIVATIONS.filter(function (c) { return c.id === selectedId; })[0]
        || PAST_CULTIVATIONS[0];

    // 이전 재배 이력에는 시작일이 내려오지 않아 재배 기간은 비교할 수 없음 -> 재배량만 비교
    document.getElementById('end-compare-rows').innerHTML =
        buildCompareRow('총 재배량', stats.totalAmount, target.amount || 0, 'g');
}

function finishCultivation() {
    closeModal('modal-end-compare');
    location.href = '/';
}

// 사진 카드 아래 날짜 선택기로 고른 날짜 (YYYY-MM-DD). null이면 최신 사진을 보여줌.
var PHOTO_DATE_FILTER = null;

function photosForDate(dateStr) {
    return PHOTOS.filter(function (p) {
        return p.updatedAt && p.updatedAt.slice(0, 10) === dateStr;
    });
}

function mdpFormatLabel(dateStr) {
    var parts = dateStr.split('-');
    return parts[0] + '. ' + parts[1] + '. ' + parts[2] + '.';
}

function onPhotoDateChange(value) {
    PHOTO_DATE_FILTER = value || null;
    var label = document.getElementById('mdp-trigger-label');
    if (label) {
        label.textContent = PHOTO_DATE_FILTER ? mdpFormatLabel(PHOTO_DATE_FILTER) : '최신 사진';
    }
    renderMainPhoto();
}

// ---- 커스텀 달력(mdp) ----
// 네이티브 <input type="date"> 팝업은 브라우저가 직접 그려서 CSS를 전혀 못 먹여서
// .msh-select 드롭다운이랑 비슷하게 트리거 버튼 + 패널 구조로 직접 구현함.
// 재배지 시작일(CULTIVATION_STARTED_AT) 이전 ~ 오늘 이후는 고를 수 없게 막음.
var MDP_TODAY = new Date();
var MDP_MAX = MDP_TODAY.getFullYear() + '-' + String(MDP_TODAY.getMonth() + 1).padStart(2, '0') + '-' + String(MDP_TODAY.getDate()).padStart(2, '0');
var MDP_MIN = (typeof CULTIVATION_STARTED_AT !== 'undefined' && CULTIVATION_STARTED_AT) ? CULTIVATION_STARTED_AT : null;
var mdpMinYear = MDP_MIN ? Number(MDP_MIN.split('-')[0]) : null;
var mdpMinMonth = MDP_MIN ? Number(MDP_MIN.split('-')[1]) - 1 : null;
var mdpMaxYear = MDP_TODAY.getFullYear();
var mdpMaxMonth = MDP_TODAY.getMonth();
var mdpViewYear = mdpMaxYear;
var mdpViewMonth = mdpMaxMonth;

function mdpFormatDate(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function toggleMdp() {
    var wrap = document.getElementById('mdp');
    if (!wrap) return;
    if (wrap.classList.contains('open')) {
        closeMdp();
        return;
    }
    var base = PHOTO_DATE_FILTER || MDP_MAX;
    var parts = base.split('-');
    mdpViewYear = Number(parts[0]);
    mdpViewMonth = Number(parts[1]) - 1;
    renderMdpDays();
    wrap.classList.add('open');

    // 사진 카드가 overflow:hidden이라 팝업이 카드 경계에서 잘려버려서, msh-select 드롭다운과
    // 같은 방식으로 열려있는 동안만 패널을 body로 옮겨서 fixed 포지션으로 그림.
    // body로 옮기면 ".mdp.open .mdp-panel" 같은 조상 셀렉터는 더 이상 안 먹히니(패널이
    // .mdp 밖으로 나감) display도 인라인으로 같이 세팅해야 함 — msh-select.js도 같은 이유로 그렇게 함.
    var trigger = document.getElementById('mdp-trigger');
    var panel = document.getElementById('mdp-panel');
    var rect = trigger.getBoundingClientRect();
    document.body.appendChild(panel);
    panel.style.display = 'block';
    panel.style.position = 'fixed';
    panel.style.top = (rect.bottom + 10) + 'px';
    panel.style.left = rect.left + 'px';
    panel.style.zIndex = '200';
}

function closeMdp() {
    var wrap = document.getElementById('mdp');
    if (!wrap) return;
    wrap.classList.remove('open');

    var panel = document.getElementById('mdp-panel');
    if (panel && panel.parentElement === document.body) {
        panel.style.display = '';
        panel.style.position = '';
        panel.style.top = '';
        panel.style.left = '';
        panel.style.zIndex = '';
        wrap.appendChild(panel);
    }
}

function mdpChangeMonth(delta) {
    mdpViewMonth += delta;
    if (mdpViewMonth < 0) {
        mdpViewMonth = 11;
        mdpViewYear--;
    } else if (mdpViewMonth > 11) {
        mdpViewMonth = 0;
        mdpViewYear++;
    }
    renderMdpDays();
}

function mdpSelectDay(dateStr) {
    onPhotoDateChange(dateStr);
    closeMdp();
}

function renderMdpDays() {
    var monthLabel = document.getElementById('mdp-month-label');
    if (monthLabel) monthLabel.textContent = mdpViewYear + '년 ' + (mdpViewMonth + 1) + '월';

    var firstDayOfWeek = new Date(mdpViewYear, mdpViewMonth, 1).getDay();
    var daysInMonth = new Date(mdpViewYear, mdpViewMonth + 1, 0).getDate();

    var html = '';
    for (var i = 0; i < firstDayOfWeek; i++) {
        html += '<button type="button" class="mdp-day mdp-day--other-month" disabled></button>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = mdpFormatDate(mdpViewYear, mdpViewMonth, day);
        var disabled = (MDP_MIN && dateStr < MDP_MIN) || dateStr > MDP_MAX;
        var selected = PHOTO_DATE_FILTER === dateStr;
        html += '<button type="button" class="mdp-day' + (selected ? ' mdp-day--selected' : '') + '"' +
            (disabled ? ' disabled' : ' onclick="mdpSelectDay(\'' + dateStr + '\')"') + '>' + day + '</button>';
    }
    var daysEl = document.getElementById('mdp-days');
    if (daysEl) daysEl.innerHTML = html;

    var prevBtn = document.getElementById('mdp-prev');
    var nextBtn = document.getElementById('mdp-next');
    if (prevBtn) {
        prevBtn.disabled = mdpMinYear != null &&
            (mdpViewYear < mdpMinYear || (mdpViewYear === mdpMinYear && mdpViewMonth <= mdpMinMonth));
    }
    if (nextBtn) {
        nextBtn.disabled = mdpViewYear > mdpMaxYear || (mdpViewYear === mdpMaxYear && mdpViewMonth >= mdpMaxMonth);
    }
}

document.addEventListener('click', function (e) {
    // 패널이 열려있을 땐 body로 옮겨져서 #mdp 바깥에 있으니 패널 자체도 같이 체크해야
    // 월 이동 버튼 클릭 시 바로 닫혀버리는 문제가 안 생김
    if (!e.target.closest('#mdp') && !e.target.closest('#mdp-panel')) {
        closeMdp();
    }
});

document.addEventListener('scroll', function (e) {
    if (e.target.closest && e.target.closest('#mdp-panel')) return;
    closeMdp();
}, true);

function renderMainPhoto() {
    var placeholder = document.getElementById('photo-placeholder');
    var placeholderText = document.getElementById('photo-placeholder-text');
    var img = document.getElementById('photo-preview-img');
    var candidates = PHOTO_DATE_FILTER ? photosForDate(PHOTO_DATE_FILTER) : PHOTOS;

    if (candidates.length === 0) {
        placeholder.style.display = 'flex';
        img.style.display = 'none';
        img.src = '';
        if (placeholderText) {
            placeholderText.textContent = PHOTO_DATE_FILTER
                ? '이 날짜엔 등록된 사진이 없어요'
                : '등록된 사진이 없습니다';
        }
        return;
    }
    placeholder.style.display = 'none';
    img.style.display = 'block';
    img.src = candidates[0].uri;
}

// 업로드 박스(네모 칸) 자체에 현재 대표 사진(가장 최근 사진)을 미리보기로 보여줌.
// 사진이 없을 때만 업로드 아이콘을 보여주고, 있으면 그 안에 바로 사진이 뜨게 함.
function renderPhotoUploadPreview() {
    ['photo-upload-preview', 'photo-upload-preview-main'].forEach(function (id) {
        var box = document.getElementById(id);
        if (!box) return;
        if (PHOTOS.length === 0) {
            box.innerHTML = '<i data-lucide="upload" style="width:28px;height:28px;"></i>';
        } else {
            box.innerHTML = '<img src="' + PHOTOS[0].uri + '" alt="재배 사진" />';
        }
    });
    lucide.createIcons();
}

function renderPhotoThumbs() {
    var wrap = document.getElementById('settings-photo-thumbs');
    if (!wrap) return; // 환경 설정 모달에서 썸네일 목록(X 삭제 버튼) 자체를 뺐음
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

function submitPhotoUpload(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
        alert('사진 파일 크기는 10MB를 초과할 수 없습니다.');
        input.value = '';
        return;
    }

    input.form.submit();
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

var cultivationDeleteForm = document.getElementById('cultivation-delete-form');
if (cultivationDeleteForm && typeof CULTIVATION_ID !== 'undefined') {
    cultivationDeleteForm.action = '/cultivations/' + CULTIVATION_ID;
}

var harvestModeForm = document.getElementById('harvest-mode-form');
if (harvestModeForm && typeof CULTIVATION_ID !== 'undefined') {
    harvestModeForm.action = '/cultivations/' + CULTIVATION_ID + '/harvest-mode';
}

var photoUploadForm = document.getElementById('photo-upload-form');
if (photoUploadForm && typeof CULTIVATION_ID !== 'undefined') {
    photoUploadForm.action = '/cultivations/' + CULTIVATION_ID + '/photos';
}

renderPhotoThumbs();
renderPhotoUploadPreview();
renderMainPhoto();
if (document.getElementById('mdp')) {
    onPhotoDateChange(MDP_MAX);
}
initializeSensorBootstrap();

var DIFFICULTY_LABELS = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];
var SPEED_LABELS = ['', '매우 느림', '느림', '보통', '빠름', '매우 빠름'];

function makeBadge(text) {
    var span = document.createElement('span');
    span.className = 'mushroom-badge';
    span.textContent = text;
    return span;
}

function renderEnvBlock(title, condition) {
    var box = document.createElement('div');
    box.className = 'mushroom-env-box';

    var heading = document.createElement('div');
    heading.className = 'mushroom-env-heading';
    heading.textContent = title;
    box.appendChild(heading);

    var rows = [
        ['온도', condition ? condition.temperature : null, '℃'],
        ['습도', condition ? condition.humidity : null, '%'],
        ['CO2', condition ? condition.co2 : null, 'ppm'],
        ['조도', condition ? condition.light : null, 'lux']
    ];

    rows.forEach(function (row) {
        var label = row[0], range = row[1], unit = row[2];
        var line = document.createElement('div');
        line.className = 'mushroom-env-row';
        var value = (range && range.min != null && range.max != null)
            ? (range.min + ' ~ ' + range.max + unit)
            : '정보 없음';
        line.innerHTML = '<span class="mushroom-env-label">' + label + '</span><span class="mushroom-env-value"></span>';
        line.querySelector('.mushroom-env-value').textContent = value;
        box.appendChild(line);
    });

    return box;
}

function renderMushroomInfo(guide) {
    var mushroomName = (guide && guide.mushroomName) ? guide.mushroomName : '버섯';
    document.getElementById('mushroom-info-name').textContent = mushroomName;

    if (!guide) {
        document.getElementById('mushroom-badges').innerHTML = '';
        document.getElementById('mushroom-info-summary').textContent = 'AI 가이드를 불러오지 못했어요. 재배지는 생성 후에도 이용할 수 있어요.';
        document.getElementById('mushroom-info-caution-wrap').style.display = 'none';
        document.getElementById('mushroom-info-tip-wrap').style.display = 'none';
        document.getElementById('mushroom-env-grid').innerHTML = '';
        document.getElementById('mushroom-recipe-btn').style.display = 'none';
        return;
    }

    var badges = document.getElementById('mushroom-badges');
    badges.innerHTML = '';
    var evaluation = guide.evaluation;
    if (evaluation) {
        badges.appendChild(makeBadge('난이도 ' + (DIFFICULTY_LABELS[evaluation.difficultyLevel] || evaluation.difficultyLevel)));
        badges.appendChild(makeBadge('성장속도 ' + (SPEED_LABELS[evaluation.growthSpeed] || evaluation.growthSpeed)));
        if (evaluation.sensitivity) {
            badges.appendChild(makeBadge(evaluation.sensitivity));
        }
    }

    document.getElementById('mushroom-info-summary').textContent = guide.summary || (evaluation ? evaluation.aiStrategy : '') || '';

    var cautionWrap = document.getElementById('mushroom-info-caution-wrap');
    if (guide.caution) {
        cautionWrap.style.display = '';
        document.getElementById('mushroom-info-caution').textContent = guide.caution;
    } else {
        cautionWrap.style.display = 'none';
    }

    var tipWrap = document.getElementById('mushroom-info-tip-wrap');
    if (guide.tip) {
        tipWrap.style.display = '';
        document.getElementById('mushroom-info-tip').textContent = guide.tip;
    } else {
        tipWrap.style.display = 'none';
    }

    var envGrid = document.getElementById('mushroom-env-grid');
    envGrid.innerHTML = '';
    if (guide.cultivationCondition || guide.harvestCondition) {
        envGrid.appendChild(renderEnvBlock('재배 환경 조건', guide.cultivationCondition));
        envGrid.appendChild(renderEnvBlock('수확 환경 조건', guide.harvestCondition));
    }

    var recipeBtn = document.getElementById('mushroom-recipe-btn');
    var recipeList = document.getElementById('mushroom-recipe-list');
    recipeList.innerHTML = '';
    if (guide.recipes && guide.recipes.length > 0) {
        recipeBtn.style.display = '';
        guide.recipes.forEach(function (recipe) {
            var card = document.createElement('div');
            card.className = 'mushroom-recipe-card';
            var name = document.createElement('div');
            name.className = 'mushroom-recipe-name';
            name.textContent = recipe.name;
            var instructions = document.createElement('div');
            instructions.className = 'mushroom-recipe-instructions';
            instructions.textContent = recipe.instructions;
            card.appendChild(name);
            card.appendChild(instructions);
            recipeList.appendChild(card);
        });
    } else {
        recipeBtn.style.display = 'none';
    }

    lucide.createIcons();
}

function openRecipeModal() {
    document.getElementById('recipe-modal-overlay').classList.add('active');
}

function closeRecipeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('recipe-modal-overlay').classList.remove('active');
}

function openMushroomGuideModal() {
    if (!MUSHROOM_ID) {
        alert('현재 재배지의 버섯 정보를 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    openModal('modal-mushroom-guide');

    fetch('/cultivations/mushrooms/' + MUSHROOM_ID + '/guide')
        .then(function (res) { return res.json(); })
        .then(function (result) {
            var guide = (result && result.success) ? result.data : null;
            renderMushroomInfo(guide);
        })
        .catch(function () {
            renderMushroomInfo(null);
        });
}