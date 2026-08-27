lucide.createIcons();

var environmentSettings = [];
var manualSettingEnabled = false;

var SENSOR_TYPE_LABELS = {
    TEMPERATURE: '온도',
    HUMIDITY: '습도',
    CO2: 'CO2',
    LIGHT: '조도'
};

var MUSHROOMS = [];

var DIFFICULTY_LABELS = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];
var SPEED_LABELS = ['', '매우 느림', '느림', '보통', '빠름', '매우 빠름'];

function renderMushroomSelect() {
    var select = document.getElementById('f-mushroom');
    select.innerHTML = '';
    if (MUSHROOMS.length === 0) {
        select.innerHTML = '<option value="">등록된 버섯이 없습니다</option>';
        return;
    }
    MUSHROOMS.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.mushroomNameKo;
        select.appendChild(opt);
    });
}

MUSHROOMS = Array.isArray(mushroomsData) ? mushroomsData : [];
renderMushroomSelect();

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
    var selected = document.getElementById('f-mushroom');
    var mushroomName = (guide && guide.mushroomName) || (selected.selectedOptions[0] ? selected.selectedOptions[0].textContent : '');
    document.getElementById('mushroom-info-name').textContent = mushroomName;
    document.getElementById('result-mushroom').textContent = mushroomName;

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
}

function openRecipeModal() {
    document.getElementById('recipe-modal-overlay').classList.add('active');
}

function closeRecipeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('recipe-modal-overlay').classList.remove('active');
}

function goToStep(n) {
    document.querySelectorAll('.wizard-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.wizard-step').forEach(function (s) { s.classList.remove('active', 'done'); });
    document.getElementById('step-' + n).classList.add('active');
    document.getElementById('stepnav-' + n).classList.add('active');
    for (var i = 1; i < n; i++) {
        document.getElementById('stepnav-' + i).classList.add('done');
    }

    if (n === 2) {
        var nameInput = document.getElementById('f-name');

        if (!nameInput.value.trim()) {
            alert('재배지 이름을 입력해주세요.');
            goToStep(1);
            return;
        }

        var selected = document.getElementById('f-mushroom');
        if (!selected.value) {
            alert('버섯 종류를 확인해주세요.');
            goToStep(1);
            return;
        }

        // 다른 버섯 선택한 경우 수동 설정 상태 초기화
        manualSettingEnabled = false;
        document.getElementById('manual-setting-toggle').checked = false;
        document.getElementById('loading-mushroom').textContent = selected.selectedOptions[0].textContent;

        // 선택된 버섯의 thresholdInfoResponses로 기본 임계값을 만듭니다.
        initializeEnvironmentSettings();

        document.getElementById('loading-mushroom').textContent =
            selected.selectedOptions[0].textContent;

        fetch('/cultivations/mushrooms/' + selected.value + '/guide')
            .then(function (res) { return res.json(); })
            .then(function (result) {
                var guide = (result && result.success) ? result.data : null;
                renderMushroomInfo(guide);
                goToStep(3);
            })
            .catch(function () {
                renderMushroomInfo(null);
                goToStep(3);
            });
    }
}

function renderEnvironmentSettings() {
    var container = document.getElementById('environment-settings');
    container.replaceChildren();

    environmentSettings.forEach(function (setting, index) {
        var row = document.createElement('div');
        row.className = 'environment-setting-row';

        var label = document.createElement('span');
        label.textContent =
            (SENSOR_TYPE_LABELS[setting.sensorType] || setting.sensorType)
            + ' (' + setting.unit + ')';

        var minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.step = 'any';
        minInput.value = setting.thresholdMin;
        minInput.disabled = !manualSettingEnabled;

        var separator = document.createElement('span');
        separator.textContent = '~';

        var maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.step = 'any';
        maxInput.value = setting.thresholdMax;
        maxInput.disabled = !manualSettingEnabled;

        minInput.addEventListener('input', function () {
            var value = minInput.value.trim();

            environmentSettings[index].thresholdMin =
                value === '' ? NaN : Number(value);

            validateEnvironmentSettings();
        });

        maxInput.addEventListener('input', function () {
            var value = maxInput.value.trim();

            environmentSettings[index].thresholdMax =
                value === '' ? NaN : Number(value);

            validateEnvironmentSettings();
        });

        row.append(label, minInput, separator, maxInput);
        container.appendChild(row);
    });

    validateEnvironmentSettings();
}

function initializeEnvironmentSettings() {
    var mushroomId = document.getElementById('f-mushroom').value;

    var mushroom = MUSHROOMS.find(function (item) {
        return String(item.id) === String(mushroomId);
    });

    var thresholds = mushroom && Array.isArray(mushroom.thresholdInfoResponses)
        ? mushroom.thresholdInfoResponses
        : [];

    environmentSettings = thresholds.map(function (threshold) {
        return {
            sensorTypeId: threshold.sensorType.id,
            sensorType: threshold.sensorType.type,
            unit: threshold.sensorType.valueUnit,
            recommendedMin: Number(threshold.thresholdMin),
            recommendedMax: Number(threshold.thresholdMax),
            thresholdMin: Number(threshold.thresholdMin),
            thresholdMax: Number(threshold.thresholdMax)
        };
    });

    renderEnvironmentSettings();
}

function bindEnvironmentSettingEvents() {
    var toggle = document.getElementById('manual-setting-toggle');

    toggle.addEventListener('change', function (event) {
        manualSettingEnabled = event.target.checked;
        renderEnvironmentSettings();
    });
}

function validateEnvironmentSettings() {
    var message = '';

    if (environmentSettings.length === 0) {
        message = '등록된 재배 환경 기준이 없습니다.';
    } else {
        environmentSettings.some(function (setting) {
            if (!Number.isFinite(setting.thresholdMin)
                || !Number.isFinite(setting.thresholdMax)) {
                message = '최소값과 최대값을 모두 입력해주세요.';
                return true;
            }

            if (setting.thresholdMin >= setting.thresholdMax) {
                message = '최소값은 최대값보다 작아야 합니다.';
                return true;
            }

            if (setting.thresholdMin < setting.recommendedMin
                || setting.thresholdMax > setting.recommendedMax) {
                message = 'AI 추천 범위를 벗어난 값이 있습니다.';
                return true;
            }

            return false;
        });
    }

    document.getElementById('environment-setting-error').textContent = message;
    document.getElementById('cultivation-submit').disabled = message !== '';

    return message === '';
}

function bindCultivationCreateForm() {
    var form = document.getElementById('cultivation-create-form');

    form.addEventListener('submit', function (event) {
        // 기존 HTML form 전송을 중단합니다.
        event.preventDefault();

        if (!validateEnvironmentSettings()) {
            return;
        }

        var request = {
            name: document.getElementById('f-name').value.trim(),
            mushroomId: Number(
                document.getElementById('f-mushroom').value
            ),
            environmentSettingRequests: environmentSettings.map(
                function (setting) {
                    return {
                        sensorTypeId: setting.sensorTypeId,
                        thresholdMin: setting.thresholdMin,
                        thresholdMax: setting.thresholdMax
                    };
                }
            )
        };

        fetch('/cultivations', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('재배지 생성에 실패했습니다.');
                }

                window.location.href = '/cultivations';
            })
            .catch(function (error) {
                alert(error.message);
            });
    });
}

bindEnvironmentSettingEvents();
bindCultivationCreateForm();