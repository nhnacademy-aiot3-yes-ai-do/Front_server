lucide.createIcons();

var CANONICAL_SENSOR_TYPES = ['TEMPERATURE', 'HUMIDITY', 'CO2', 'LIGHT'];
var SENSOR_DEVICES_BY_TYPE = {};
var LATEST_VALUES = {};

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

function renderSensorPanel() {
    document.querySelectorAll('.sensor-row[data-sensor-type]').forEach(function (row) {
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
    CANONICAL_SENSOR_TYPES.forEach(function (type) {
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
    var gatewayOrigin = isLocal ? 'http://localhost:8000' : 'https://api.yes-nhn.site';

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
                LATEST_VALUES[key] = { value: v.value, unit: v.unit };
                if (v.value == null) return;

                var bucket = getChartBucket(key);
                bucket.history.push(v.value);
                bucket.times.push(now);
                bucket.unit = v.unit || bucket.unit;
                trimChartBucket(bucket);
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
        var botMsg = document.createElement('div');
        botMsg.className = 'chat-message bot';
        botMsg.innerHTML = '<img src="/images/chatbot.png" alt="봇" class="chat-avatar" /><div class="chat-bubble"></div>';
        botMsg.querySelector('.chat-bubble').textContent = CHATBOT_PLACEHOLDER_REPLY;
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

var cultivationDeleteForm = document.getElementById('cultivation-delete-form');
if (cultivationDeleteForm && typeof CULTIVATION_ID !== 'undefined') {
    cultivationDeleteForm.action = '/cultivations/' + CULTIVATION_ID;
}

renderPhotoThumbs();
renderPhotoUploadPreview();
renderMainPhoto();
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