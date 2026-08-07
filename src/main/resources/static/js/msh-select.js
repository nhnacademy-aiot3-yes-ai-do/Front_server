(function initMshSelects() {
    document.querySelectorAll('.msh-select').forEach(function (el, i) {
        if (!el.id) el.id = 'msh-select-auto-' + i;
        var menu = el.querySelector('.msh-select-menu');
        if (menu) menu.dataset.owner = el.id;
    });
})();

function closeMshSelect(wrapperEl) {
    wrapperEl.classList.remove('open');
    var host = wrapperEl.closest('.card') || wrapperEl.closest('.cd-card') || wrapperEl.parentElement;
    if (host) host.classList.remove('msh-dropdown-active');

    var menu = document.querySelector('.msh-select-menu[data-owner="' + wrapperEl.id + '"]');
    if (menu && menu.parentElement === document.body) {
        menu.style.position = '';
        menu.style.zIndex = '';
        menu.style.top = '';
        menu.style.left = '';
        menu.style.right = '';
        menu.style.width = '';
        menu.style.minWidth = '';
        menu.style.display = '';
        wrapperEl.appendChild(menu);
    }
}

function toggleMshSelect(wrapperEl) {
    var isOpen = wrapperEl.classList.contains('open');
    document.querySelectorAll('.msh-select.open').forEach(closeMshSelect);
    if (isOpen) return;

    wrapperEl.classList.add('open');
    var host = wrapperEl.closest('.card') || wrapperEl.closest('.cd-card') || wrapperEl.parentElement;
    if (host) host.classList.add('msh-dropdown-active');

    var trigger = wrapperEl.querySelector('.msh-select-trigger');
    var menu = wrapperEl.querySelector('.msh-select-menu');
    var rect = trigger.getBoundingClientRect();

    document.body.appendChild(menu);
    menu.style.display = 'block';
    menu.style.position = 'fixed';
    menu.style.zIndex = '200';
    menu.style.top = (rect.bottom + 6) + 'px';
    // 기본적으로 메뉴 폭을 트리거(박스) 폭이랑 정확히 맞춤 (좁은 박스인데 옵션 텍스트 때문에
    // 메뉴만 삐져나오게 넓어지던 문제). fixed 포지션이 되면 CSS의 min-width:100%가
    // (뷰포트 기준으로 재계산되면서) width보다 우선 적용돼서 전체 폭으로 늘어나 버리므로,
    // min-width도 같이 인라인으로 강제해서 그 규칙을 덮어씀.
    // 그래프 드롭다운처럼 일부러 더 넓혀야 하는 변형은 각자 CSS에서 width/min-width를
    // !important로 다시 auto/고정값으로 풀어줌.
    menu.style.width = rect.width + 'px';
    menu.style.minWidth = rect.width + 'px';

    var menuWidth = menu.offsetWidth;
    if (rect.left + menuWidth > window.innerWidth - 12) {
        menu.style.left = '';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
    } else {
        menu.style.right = '';
        menu.style.left = rect.left + 'px';
    }
}

function selectMshOption(optionEl) {
    var menuEl = optionEl.closest('.msh-select-menu');
    var wrapperEl = document.getElementById(menuEl.dataset.owner);
    var value = optionEl.dataset.value != null ? optionEl.dataset.value : optionEl.textContent.trim();

    wrapperEl.dataset.value = value;
    wrapperEl.querySelector('.msh-select-value').textContent = optionEl.textContent.trim();
    menuEl.querySelectorAll('.msh-select-option').forEach(function (o) {
        o.classList.remove('selected');
    });
    optionEl.classList.add('selected');
    closeMshSelect(wrapperEl);

    var handlerName = wrapperEl.dataset.onchange;
    if (handlerName && typeof window[handlerName] === 'function') {
        window[handlerName](wrapperEl, optionEl, wrapperEl.dataset.onchangeArg);
    }
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.msh-select') && !e.target.closest('.msh-select-menu')) {
        document.querySelectorAll('.msh-select.open').forEach(closeMshSelect);
    }
});

document.addEventListener('scroll', function (e) {
    if (e.target.closest && e.target.closest('.msh-select-menu')) return;
    document.querySelectorAll('.msh-select.open').forEach(closeMshSelect);
}, true);

function setMshSelectValue(wrapperEl, value) {
    if (!wrapperEl) return;
    wrapperEl.dataset.value = value;
    var matched = null;
    wrapperEl.querySelectorAll('.msh-select-option').forEach(function (o) {
        var optValue = o.dataset.value != null ? o.dataset.value : o.textContent.trim();
        var isMatch = optValue === value;
        o.classList.toggle('selected', isMatch);
        if (isMatch) matched = o;
    });
    var valueEl = wrapperEl.querySelector('.msh-select-value');
    if (valueEl) valueEl.textContent = matched ? matched.textContent.trim() : value;
}
