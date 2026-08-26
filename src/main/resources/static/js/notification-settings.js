var EVENT_GROUPS = {
    sensor: [
        'ENVIRONMENT_THRESHOLD_BREACHED',
        'ENVIRONMENT_RECOVERED',
        'SENSOR_OFFLINE',
        'SENSOR_ERROR'
    ],
    harvest: ['HARVEST_COMPLETED', 'CULTIVATION_FINISHED'],
    ai: ['DAILY_FEEDBACK_COMPLETED']
};

var discordEndpoint = null;
var discordModalMode = 'create';
var subscriptionTypes = [];
var subscriptions = [];
var cultivations = [];
var fetchErrors = {};
var pendingGroups = {};
var saveQueue = Promise.resolve();

function showSaveStatus(message, isError) {
    var el = document.getElementById('save-status');
    if (!el) return;
    el.textContent = message || (isError ? '저장 실패' : '저장됨');
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(showSaveStatus._t);
    showSaveStatus._t = setTimeout(function () {
        el.classList.remove('show');
    }, 1600);
}

function setSubscriptionHint(text) {
    var el = document.getElementById('subscription-hint');
    if (el) el.textContent = text || '';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sameId(left, right) {
    return Number(left) === Number(right);
}

function redirectIfLogin(response) {
    if ((response.redirected && response.url && response.url.indexOf('/login') !== -1)
        || response.status === 401
        || response.status === 403) {
        window.location.href = '/login';
        return true;
    }
    return false;
}

function parseErrorDetail(text) {
    if (!text) return '요청에 실패했습니다.';
    try {
        var body = JSON.parse(text);
        return body.detail || text;
    } catch (e) {
        return text;
    }
}

function apiRequest(url, options) {
    return fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}))
        .then(function (response) {
            return response.text().then(function (text) {
                return { response: response, text: text };
            });
        })
        .then(function (result) {
            if (redirectIfLogin(result.response)) {
                return Promise.reject(new Error('login'));
            }
            if (!result.response.ok && result.response.status !== 204) {
                throw new Error(parseErrorDetail(result.text));
            }
            if (!result.text) return null;
            try {
                return JSON.parse(result.text);
            } catch (e) {
                return null;
            }
        });
}

function typesForGroup(groupKey) {
    var codes = EVENT_GROUPS[groupKey] || [];
    return subscriptionTypes.filter(function (type) {
        return type
            && type.targetType === 'CULTIVATION'
            && codes.indexOf(type.eventType) !== -1;
    });
}

function enabledSubscriptions() {
    return subscriptions.filter(function (item) {
        return item && item.enabled;
    });
}

function isCategoryOn(groupKey) {
    var typeIds = typesForGroup(groupKey).map(function (type) {
        return Number(type.id);
    });
    return enabledSubscriptions().some(function (item) {
        return typeIds.indexOf(Number(item.subscriptionTypeId)) !== -1;
    });
}

function isCultivationOn(cultivationId) {
    return enabledSubscriptions().some(function (item) {
        return item.targetType === 'CULTIVATION' && sameId(item.targetId, cultivationId);
    });
}

function isCategoryChecked(groupKey) {
    return isCategoryOn(groupKey) || !!pendingGroups[groupKey];
}

function selectedGroups() {
    return ['sensor', 'harvest', 'ai'].filter(isCategoryChecked);
}

function hasSelectedType() {
    return selectedGroups().length > 0;
}

function checkedCultivationIds() {
    var ids = [];
    cultivations.forEach(function (item) {
        if (isCultivationOn(item.cultivationId)) {
            ids.push(Number(item.cultivationId));
        }
    });
    return ids;
}

function upsertSubscription(updated) {
    if (!updated || !updated.id) return;
    var found = false;
    subscriptions = subscriptions.map(function (item) {
        if (sameId(item.id, updated.id)) {
            found = true;
            return updated;
        }
        return item;
    });
    if (!found) {
        subscriptions.unshift(updated);
    }
}

function findSubscription(typeId, cultivationId, endpointId) {
    return subscriptions.find(function (item) {
        return sameId(item.subscriptionTypeId, typeId)
            && sameId(item.targetId, cultivationId)
            && sameId(item.endpointId, endpointId);
    }) || null;
}

function ensureDiscordReady() {
    if (discordEndpoint && discordEndpoint.id) return true;
    showSaveStatus('디스코드를 먼저 연결해주세요.', true);
    setSubscriptionHint('알림을 받으려면 먼저 디스코드 웹후크를 연결해주세요.');
    return false;
}

function ensureSubscription(typeId, cultivationId) {
    if (!discordEndpoint || !discordEndpoint.id) {
        return Promise.reject(new Error('디스코드 연결이 필요합니다.'));
    }
    var existing = findSubscription(typeId, cultivationId, discordEndpoint.id);
    if (existing && existing.enabled) {
        return Promise.resolve(existing);
    }
    if (existing) {
        return apiRequest('/notifications/subscriptions/' + existing.id + '/enabled', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true })
        }).then(function (updated) {
            upsertSubscription(updated || Object.assign({}, existing, { enabled: true }));
            return updated;
        });
    }
    return apiRequest('/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subscriptionTypeId: typeId,
            endpointId: discordEndpoint.id,
            targetId: cultivationId
        })
    }).then(function (created) {
        upsertSubscription(created);
        return created;
    });
}

function disableSubscription(item) {
    if (!item || !item.enabled) return Promise.resolve(item);
    return apiRequest('/notifications/subscriptions/' + item.id + '/enabled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false })
    }).then(function (updated) {
        upsertSubscription(updated || Object.assign({}, item, { enabled: false }));
        return updated;
    });
}

function runSequentially(tasks) {
    return tasks.reduce(function (chain, task) {
        return chain.then(task);
    }, Promise.resolve());
}

function ensureGroupForTargets(groupKey, targetIds) {
    var types = typesForGroup(groupKey);
    var tasks = [];
    targetIds.forEach(function (targetId) {
        types.forEach(function (type) {
            tasks.push(function () {
                return ensureSubscription(type.id, targetId);
            });
        });
    });
    return runSequentially(tasks);
}

function disableGroup(groupKey) {
    var typeIds = typesForGroup(groupKey).map(function (type) {
        return Number(type.id);
    });
    return runSequentially(enabledSubscriptions()
        .filter(function (item) {
            return typeIds.indexOf(Number(item.subscriptionTypeId)) !== -1;
        })
        .map(function (item) {
            return function () {
                return disableSubscription(item);
            };
        }));
}

function disableTarget(cultivationId) {
    return runSequentially(enabledSubscriptions()
        .filter(function (item) {
            return item.targetType === 'CULTIVATION' && sameId(item.targetId, cultivationId);
        })
        .map(function (item) {
            return function () {
                return disableSubscription(item);
            };
        }));
}

function setTogglesBusy(busy) {
    ['toggle-sensor', 'toggle-harvest', 'toggle-ai'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.disabled = busy || !discordEndpoint;
    });
    var lockCultivations = busy || !discordEndpoint || !hasSelectedType();
    document.querySelectorAll('#cultivation-toggle-list input[type="checkbox"]').forEach(function (el) {
        el.disabled = lockCultivations;
    });
}

function renderCategoryToggles() {
    var sensor = document.getElementById('toggle-sensor');
    var harvest = document.getElementById('toggle-harvest');
    var ai = document.getElementById('toggle-ai');
    if (sensor) sensor.checked = isCategoryChecked('sensor');
    if (harvest) harvest.checked = isCategoryChecked('harvest');
    if (ai) ai.checked = isCategoryChecked('ai');
}

function renderCultivationList() {
    var listEl = document.getElementById('cultivation-toggle-list');
    if (!listEl) return;

    if (fetchErrors.cultivations) {
        listEl.innerHTML = '<p class="settings-error">재배지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
        return;
    }

    if (!Array.isArray(cultivations) || cultivations.length === 0) {
        listEl.innerHTML = '<p class="settings-empty">참여 중인 재배지가 없어요.</p>';
        return;
    }

    listEl.innerHTML = cultivations.map(function (item) {
        var checked = isCultivationOn(item.cultivationId);
        var name = escapeHtml(item.name || ('재배지 ' + item.cultivationId));
        return (
            '<div class="settings-row">' +
            '<div class="settings-row-icon"><i data-lucide="sprout"></i></div>' +
            '<span class="settings-row-name">' + name + '</span>' +
            '<label class="toggle-switch">' +
            '<input type="checkbox" data-cultivation-id="' + Number(item.cultivationId) + '"' +
            (checked ? ' checked' : '') +
            (discordEndpoint ? '' : ' disabled') + ' />' +
            '<span class="toggle-track"><span class="toggle-thumb"></span></span>' +
            '</label>' +
            '</div>'
        );
    }).join('');

    listEl.querySelectorAll('input[data-cultivation-id]').forEach(function (input) {
        input.addEventListener('change', function () {
            handleCultivationToggle(Number(input.getAttribute('data-cultivation-id')), input.checked);
        });
    });

    if (window.lucide) lucide.createIcons();
}

function refreshSubscriptionUi() {
    renderCategoryToggles();
    renderCultivationList();
    setTogglesBusy(false);
    if (!discordEndpoint) {
        setSubscriptionHint('알림을 받으려면 먼저 디스코드 웹후크를 연결해주세요.');
        return;
    }
    if (cultivations.length === 0) {
        setSubscriptionHint('참여 중인 재배지가 있으면 재배지별로 알림을 켤 수 있어요.');
        return;
    }
    if (!hasSelectedType()) {
        setSubscriptionHint('알림 유형을 먼저 켠 다음, 받을 재배지를 선택하세요.');
        return;
    }
    if (Object.keys(pendingGroups).length > 0 && checkedCultivationIds().length === 0) {
        setSubscriptionHint('받을 재배지를 켜면 서버에 저장됩니다.');
        return;
    }
    setSubscriptionHint('켠 유형의 알림을 선택한 재배지로 받아요.');
}

function renderFetchErrors() {
    var failed = Object.keys(fetchErrors).filter(function (key) { return fetchErrors[key]; });
    if (failed.length === 0) return;
    var endpointFailed = failed.indexOf('endpoints') !== -1;
    var subscriptionFailed = failed.indexOf('subscriptions') !== -1
        || failed.indexOf('subscription-types') !== -1;
    var cultivationFailed = failed.indexOf('cultivations') !== -1;
    if (endpointFailed) {
        setDiscordStatus('연결 상태를 불러오지 못했습니다', false);
    }
    if (cultivationFailed) {
        setSubscriptionHint('재배지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } else if (subscriptionFailed) {
        setSubscriptionHint('구독 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    setTogglesBusy(true);
}

function enqueueSave(task) {
    setTogglesBusy(true);
    saveQueue = saveQueue
        .then(task)
        .then(function () {
            showSaveStatus('저장됨', false);
        })
        .catch(function (error) {
            if (error && error.message === 'login') return;
            showSaveStatus(error && error.message ? error.message : '저장 실패', true);
        })
        .then(function () {
            refreshSubscriptionUi();
        });
    return saveQueue;
}

function handleCategoryToggle(key, checked) {
    if (!ensureDiscordReady()) {
        refreshSubscriptionUi();
        return;
    }
    if (checked) {
        var targets = checkedCultivationIds();
        if (targets.length === 0) {
            pendingGroups[key] = true;
            refreshSubscriptionUi();
            return;
        }
        enqueueSave(function () {
            return ensureGroupForTargets(key, targets).then(function () {
                delete pendingGroups[key];
            });
        });
        return;
    }
    delete pendingGroups[key];
    if (!isCategoryOn(key)) {
        refreshSubscriptionUi();
        return;
    }
    enqueueSave(function () {
        return disableGroup(key);
    });
}

function handleCultivationToggle(id, checked) {
    if (!ensureDiscordReady()) {
        refreshSubscriptionUi();
        return;
    }
    var groups = selectedGroups();
    if (checked && groups.length === 0) {
        showSaveStatus('알림 유형을 먼저 켜주세요.', true);
        refreshSubscriptionUi();
        return;
    }
    if (!checked) {
        enqueueSave(function () {
            return disableTarget(id);
        });
        return;
    }
    enqueueSave(function () {
        return runSequentially(groups.map(function (key) {
            return function () {
                return ensureGroupForTargets(key, [id]);
            };
        })).then(function () {
            groups.forEach(function (key) {
                delete pendingGroups[key];
            });
        });
    });
}

function pickDiscordEndpoint(endpoints) {
    if (!Array.isArray(endpoints)) return null;
    var discords = endpoints.filter(function (item) {
        return item && item.channelCode === 'DISCORD';
    });
    if (discords.length === 0) return null;
    var enabled = discords.find(function (item) { return item.enabled; });
    return enabled || discords[0];
}

function setDiscordStatus(text, connected) {
    var statusEl = document.getElementById('discord-status');
    var btnEl = document.getElementById('discord-action-btn');
    if (!statusEl || !btnEl) return;

    statusEl.textContent = text;
    statusEl.classList.toggle('connected', !!connected);
    btnEl.disabled = false;
    btnEl.textContent = connected ? '연결 해제' : '연결하기';
    btnEl.onclick = connected ? handleDiscordDisconnect : openDiscordModal;
}

function renderDiscordStatus() {
    if (!discordEndpoint) {
        setDiscordStatus('연결 안 됨', false);
        return;
    }
    var name = discordEndpoint.displayName || '디스코드';
    var dest = discordEndpoint.destination ? ' · ' + discordEndpoint.destination : '';
    setDiscordStatus('연결됨 · ' + name + dest, true);
}

function isDiscordWebhookUrl(url) {
    try {
        var parsed = new URL(url);
        var host = (parsed.hostname || '').toLowerCase();
        return parsed.protocol === 'https:'
            && (host === 'discord.com' || host === 'discordapp.com' || host.endsWith('.discord.com'))
            && parsed.pathname.indexOf('/api/webhooks/') === 0
            && !parsed.username;
    } catch (e) {
        return false;
    }
}

function setDiscordFormStatus(message, isError) {
    var statusText = document.getElementById('discord-form-status');
    if (!statusText) return;
    statusText.textContent = message || '';
    statusText.classList.toggle('error', !!isError);
}

function openDiscordModal() {
    discordModalMode = discordEndpoint ? 'update' : 'create';
    document.getElementById('discord-modal-title').textContent =
        discordModalMode === 'update' ? '디스코드 웹후크 수정' : '디스코드 연동하기';
    document.getElementById('discord-display-name').value =
        discordEndpoint && discordEndpoint.displayName ? discordEndpoint.displayName : '디스코드 알림';
    document.getElementById('discord-webhook-url').value = '';
    setDiscordFormStatus('', false);
    document.getElementById('discord-step-connect').style.display = 'block';
    document.getElementById('discord-step-success').style.display = 'none';
    document.getElementById('discord-submit-btn').disabled = false;
    openModal('modal-discord');
    if (window.lucide) lucide.createIcons();
}

function closeDiscordModal() {
    closeModal('modal-discord');
}

function handleDiscordConnect() {
    var displayName = document.getElementById('discord-display-name').value.trim();
    var destination = document.getElementById('discord-webhook-url').value.trim();
    var submitBtn = document.getElementById('discord-submit-btn');

    if (!displayName) {
        setDiscordFormStatus('이름을 입력해주세요.', true);
        return;
    }
    if (!destination) {
        setDiscordFormStatus('Webhook URL을 입력해주세요.', true);
        return;
    }
    if (!isDiscordWebhookUrl(destination)) {
        setDiscordFormStatus('https://discord.com/api/webhooks/ 형식의 URL만 사용할 수 있어요.', true);
        return;
    }

    var method = 'POST';
    var url = '/notifications/endpoints';
    if (discordModalMode === 'update' && discordEndpoint && discordEndpoint.id) {
        method = 'PATCH';
        url = '/notifications/endpoints/' + discordEndpoint.id;
    }

    submitBtn.disabled = true;
    setDiscordFormStatus('연결 중...', false);

    apiRequest(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destination, displayName: displayName })
    })
        .then(function (created) {
            if (created) discordEndpoint = created;
            renderDiscordStatus();
            showSaveStatus('저장됨', false);
            document.getElementById('discord-step-connect').style.display = 'none';
            document.getElementById('discord-step-success').style.display = 'block';
            if (window.lucide) lucide.createIcons();
            return loadSubscriptionState();
        })
        .catch(function (error) {
            if (error && error.message === 'login') return;
            setDiscordFormStatus(error && error.message ? error.message : '연결하지 못했습니다.', true);
            submitBtn.disabled = false;
        });
}

function handleDiscordDisconnect() {
    if (!discordEndpoint || !discordEndpoint.id) {
        return;
    }
    if (!window.confirm('디스코드 연결을 해제할까요? 이 경로로 가던 구독도 함께 비활성화됩니다.')) {
        return;
    }

    apiRequest('/notifications/endpoints/' + discordEndpoint.id, { method: 'DELETE' })
        .then(function () {
            discordEndpoint = null;
            pendingGroups = {};
            renderDiscordStatus();
            showSaveStatus('저장됨', false);
            return loadSubscriptionState();
        })
        .catch(function (error) {
            if (error && error.message === 'login') return;
            setDiscordStatus('연결 해제에 실패했습니다', true);
        });
}

function loadJson(url) {
    return apiRequest(url).then(function (data) {
        return Array.isArray(data) ? data : [];
    });
}

function loadDiscordEndpoint() {
    return loadJson('/notifications/endpoints')
        .then(function (endpoints) {
            discordEndpoint = pickDiscordEndpoint(endpoints);
            renderDiscordStatus();
        })
        .catch(function (error) {
            if (error && error.message === 'login') return Promise.reject(error);
            discordEndpoint = null;
            setDiscordStatus('연결 상태를 불러오지 못했습니다', false);
            var btnEl = document.getElementById('discord-action-btn');
            if (btnEl) {
                btnEl.textContent = '다시 시도';
                btnEl.onclick = function () { loadAllSettings(); };
            }
        });
}

function loadSubscriptionState() {
    pendingGroups = {};
    return Promise.all([
        loadJson('/notifications/subscription-types'),
        loadJson('/notifications/subscriptions'),
        loadJson('/notifications/cultivations')
    ]).then(function (results) {
        subscriptionTypes = results[0];
        subscriptions = results[1];
        cultivations = results[2];
        refreshSubscriptionUi();
    }).catch(function (error) {
        if (error && error.message === 'login') return;
        subscriptionTypes = [];
        subscriptions = [];
        cultivations = [];
        var listEl = document.getElementById('cultivation-toggle-list');
        if (listEl) {
            listEl.innerHTML = '<p class="settings-empty">구독 설정을 불러오지 못했습니다.</p>';
        }
        setSubscriptionHint('구독 설정을 다시 불러와 주세요.');
        showSaveStatus('구독 설정을 불러오지 못했습니다.', true);
        setTogglesBusy(true);
    });
}

function loadAllSettings() {
    setTogglesBusy(true);
    return loadDiscordEndpoint().then(loadSubscriptionState);
}

function initFromBootstrap() {
    var endpoints = Array.isArray(window.ENDPOINTS_BOOTSTRAP) ? window.ENDPOINTS_BOOTSTRAP : [];
    discordEndpoint = pickDiscordEndpoint(endpoints);
    renderDiscordStatus();

    pendingGroups = {};
    subscriptionTypes = Array.isArray(window.SUBSCRIPTION_TYPES_BOOTSTRAP) ? window.SUBSCRIPTION_TYPES_BOOTSTRAP : [];
    subscriptions = Array.isArray(window.SUBSCRIPTIONS_BOOTSTRAP) ? window.SUBSCRIPTIONS_BOOTSTRAP : [];
    cultivations = Array.isArray(window.CULTIVATIONS_BOOTSTRAP) ? window.CULTIVATIONS_BOOTSTRAP : [];
    fetchErrors = window.NOTIFICATION_FETCH_ERRORS_BOOTSTRAP || {};
    refreshSubscriptionUi();
    renderFetchErrors();
}

function bindCategoryToggles() {
    [
        ['toggle-sensor', 'sensor'],
        ['toggle-harvest', 'harvest'],
        ['toggle-ai', 'ai']
    ].forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (!el) return;
        el.addEventListener('change', function () {
            handleCategoryToggle(pair[1], el.checked);
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    bindCategoryToggles();
    setTogglesBusy(true);
    initFromBootstrap();
    if (window.lucide) lucide.createIcons();
});
