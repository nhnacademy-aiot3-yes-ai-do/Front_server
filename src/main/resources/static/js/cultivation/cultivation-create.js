lucide.createIcons();

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
        document.getElementById('loading-mushroom').textContent = selected.selectedOptions[0].textContent;

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
