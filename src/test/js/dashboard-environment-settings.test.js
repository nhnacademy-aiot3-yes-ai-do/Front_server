const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function element() {
    const classes = new Set();
    return {
        value: '', textContent: '', innerHTML: '', hidden: false, disabled: false,
        style: {}, dataset: {}, children: [],
        classList: {
            add(name) { classes.add(name); },
            remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); },
            toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); }
        },
        appendChild(child) {
            this.children.push(child);
            if (!this.value) this.value = child.value;
        },
        focus() {}
    };
}

const payload = {
    sensors: [
        { sensorTypes: [
            { sensorTypeId: 1, type: 'TEMPERATURE', valueUnit: '°C' },
            { sensorTypeId: 2, type: 'HUMIDITY', valueUnit: '%' },
            { sensorTypeId: 4, type: 'LIGHT', valueUnit: 'lux' }
        ] },
        { sensorTypes: [{ sensorTypeId: 1, type: 'TEMPERATURE', valueUnit: '°C' }] }
    ],
    environmentSettings: [
        { sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 },
        { sensorTypeId: 2, thresholdMin: 70, thresholdMax: 90 },
        { sensorTypeId: 3, thresholdMin: 300, thresholdMax: 600 }
    ]
};

function fixture() {
    const ids = [
        'settings-sensor-select', 'settings-empty', 'settings-form-content', 'settings-config-col',
        'settings-threshold-min', 'settings-threshold-max', 'settings-threshold-min-unit',
        'settings-threshold-max-unit', 'settings-sensor-icon-wrap', 'settings-recommendation',
        'settings-edit-btn', 'settings-cancel-btn', 'settings-save-btn', 'settings-warning',
        'settings-error', 'modal-settings', 'photo-placeholder', 'photo-preview-img',
        'end-compare-field', 'end-compare-rows', 'end-compare-empty'
    ];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    const chartChildren = { '.msh-select-menu': element(), '.msh-select-value': element() };
    elements['chart-sensor-select'] = { ...element(), querySelector(selector) { return chartChildren[selector]; } };
    const requests = [];
    let reloads = 0;
    const context = {
        Promise, Date, JSON, Number, encodeURIComponent,
        MY_ROLE: 'OWNER', CULTIVATION_ID: 10, MUSHROOM_NAME: '느타리버섯', PHOTOS: [], PAST_CULTIVATIONS: [],
        SENSORS_BOOTSTRAP: { sensors: [], environmentSettings: [] }, SENSOR_VALUES_BOOTSTRAP: {},
        lucide: { createIcons() {} },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            querySelectorAll() { return []; },
            createElement() { return element(); }
        },
        window: { location: { reload() { reloads += 1; } } },
        openModal(id) { elements[id].classList.add('is-open'); },
        closeModal(id) { elements[id].classList.remove('is-open'); },
        fetch(url, options) {
            return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
        }
    };
    vm.runInNewContext(fs.readFileSync('src/main/resources/static/js/dashboard.js', 'utf8'), context,
        { filename: 'dashboard.js' });
    context.initializeEnvironmentSettingsModal(payload);
    const puts = () => requests.filter(request => request.options.method === 'PUT');
    const recommendations = () => requests.filter(request => request.url.endsWith('/sensor-validation'));
    return { context, elements, requests, puts, recommendations, reloads: () => reloads };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

async function edit(fixture, range = { recommendedMin: 18, recommendedMax: 24 }) {
    fixture.context.startEnvironmentSettingEdit();
    fixture.recommendations().at(-1).resolve({ ok: true, json: async () => ({ data: range }) });
    await flush();
}

test('only registered persisted types appear once with units and initially locked values', () => {
    const { context, elements } = fixture();
    assert.deepEqual(Array.from(context.ENVIRONMENT_SETTINGS, setting => setting.sensorTypeId), [1, 2]);
    assert.deepEqual(elements['settings-sensor-select'].children.map(option => option.textContent), ['온도 (°C)', '습도 (%)']);
    assert.equal(elements['settings-threshold-min'].value, '18');
    assert.equal(elements['settings-threshold-max'].value, '24');
    assert.equal(elements['settings-threshold-min'].disabled, true);
    assert.equal(elements['settings-threshold-min-unit'].textContent, '°C');
    assert.equal(elements['settings-edit-btn'].hidden, false);
    assert.equal(elements['settings-save-btn'].hidden, true);
    context.initializeEnvironmentSettingsModal({ sensors: [], environmentSettings: payload.environmentSettings });
    assert.equal(elements['settings-empty'].hidden, false);
    assert.equal(elements['settings-form-content'].hidden, true);
});

test('cancel restores persisted values and a sensor change requires a new edit action', async () => {
    const f = fixture();
    await edit(f);
    assert.equal(f.elements['settings-threshold-min'].disabled, false);
    f.elements['settings-threshold-min'].value = '19';
    f.context.cancelEnvironmentSettingEdit();
    assert.equal(f.elements['settings-threshold-min'].value, '18');
    assert.equal(f.elements['settings-threshold-min'].disabled, true);
    await edit(f);
    f.elements['settings-sensor-select'].value = '2';
    f.context.handleEnvironmentSensorChange();
    assert.equal(f.elements['settings-threshold-min'].value, '70');
    assert.equal(f.elements['settings-threshold-min-unit'].textContent, '%');
    assert.equal(f.elements['settings-threshold-min'].disabled, true, 'a newly selected type stays locked until Edit');
    assert.equal(f.elements['settings-edit-btn'].hidden, false);
});

test('out-of-range saves require two unchanged clicks and input changes reset confirmation', async () => {
    const f = fixture();
    await edit(f);
    f.elements['settings-threshold-min'].value = '10';
    f.context.handleEnvironmentThresholdInput();
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 0);
    assert.equal(f.elements['settings-warning'].textContent,
        '권장 재배 환경을 벗어난 설정입니다. 작물의 생육 상태와 수확 결과가 예상과 달라질 수 있습니다. 계속하시겠습니까?');
    assert.equal(f.elements['settings-save-btn'].textContent, '그래도 저장');
    f.elements['settings-threshold-min'].value = '11';
    f.context.handleEnvironmentThresholdInput();
    assert.equal(f.context.pendingThresholdConfirmation, null);
    assert.equal(f.elements['settings-warning'].textContent, '');
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 0);
    f.context.saveEnvironmentSetting();
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 1);
    assert.deepEqual(JSON.parse(f.puts()[0].options.body), { sensorTypeId: 1, thresholdMin: 11, thresholdMax: 24 });
});

test('AI failure allows valid equal endpoints but rejects empty, non-finite and reversed ranges', async () => {
    const f = fixture();
    f.context.startEnvironmentSettingEdit();
    f.recommendations()[0].reject(new Error('AI unavailable'));
    await flush();
    assert.equal(f.elements['settings-recommendation'].textContent, 'AI 권장값을 불러올 수 없습니다.');
    for (const [min, max] of [['', '24'], ['Infinity', '24'], ['25', '24']]) {
        f.elements['settings-threshold-min'].value = min;
        f.elements['settings-threshold-max'].value = max;
        f.context.saveEnvironmentSetting();
        assert.equal(f.puts().length, 0);
    }
    f.elements['settings-threshold-min'].value = '20';
    f.elements['settings-threshold-max'].value = '20';
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 1);
    f.puts()[0].resolve({ ok: true });
    await flush();
    assert.equal(f.reloads(), 1);
});

test('reopening during an in-flight save preserves the lock and values, and failure permits retry', async () => {
    const f = fixture();
    await edit(f);
    f.elements['settings-threshold-min'].value = '19';
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 1);
    f.context.closeModal('modal-settings');
    f.context.openEnvironmentSettingsModal();
    assert.equal(f.context.environmentSaving, true, 'reopening must not release an in-flight save');
    assert.equal(f.elements['settings-threshold-min'].value, '19');
    assert.equal(f.elements['settings-threshold-min'].disabled, true);
    f.context.startEnvironmentSettingEdit();
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 1);
    f.puts()[0].resolve({ ok: false, text: async () => JSON.stringify({ message: '저장 실패' }) });
    await flush();
    assert.equal(f.context.environmentSaving, false);
    assert.equal(f.elements['settings-threshold-min'].value, '19');
    assert.equal(f.elements['settings-threshold-min'].disabled, false);
    assert.equal(f.elements['settings-error'].textContent, '저장 실패');
    f.context.saveEnvironmentSetting();
    assert.equal(f.puts().length, 2);
});

test('members cannot enter edit mode or issue update requests', () => {
    const f = fixture();
    f.context.MY_ROLE = 'MEMBER';
    f.context.updateEnvironmentSettingControls();
    f.context.startEnvironmentSettingEdit();
    f.context.saveEnvironmentSetting();
    assert.equal(f.context.environmentEditing, false);
    assert.equal(f.elements['settings-edit-btn'].hidden, true);
    assert.equal(f.requests.length, 0);
});
