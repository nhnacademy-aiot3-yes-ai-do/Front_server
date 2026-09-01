(function () {
    'use strict';

    const field = document.querySelector('.spore-field');
    if (!field || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#d4a84f', '#b77b45', '#8b5e3c', '#7c9473'];
    const count = 26;

    for (let index = 0; index < count; index += 1) {
        const spore = document.createElement('span');
        const angle = (Math.PI * 2 * index / count) + (Math.random() - 0.5) * 0.35;
        const distance = 62 + Math.random() * 78;
        spore.className = 'spore';
        spore.style.setProperty('--spore-x', `${Math.cos(angle) * distance}px`);
        spore.style.setProperty('--spore-y', `${Math.sin(angle) * distance}px`);
        spore.style.setProperty('--spore-size', `${5 + Math.random() * 6}px`);
        spore.style.setProperty('--spore-delay', `${Math.random() * 0.18}s`);
        spore.style.setProperty('--spore-color', colors[index % colors.length]);
        field.appendChild(spore);
    }
})();

(function () {
    'use strict';

    const container = document.querySelector('.error-character');
    const leftLaser = document.querySelector('.eye-laser-left');
    const rightLaser = document.querySelector('.eye-laser-right');
    if (!container || !leftLaser || !rightLaser) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 눈(안경 반짝이) 위치 - .error-character 기준 % 좌표. error.css의 .eye-laser-left/right와 동일해야 함
    const eyes = [
        { el: leftLaser, xPct: 0.464, yPct: 0.265 },
        { el: rightLaser, xPct: 0.578, yPct: 0.250 }
    ];

    function pointAt(mouseX, mouseY) {
        const rect = container.getBoundingClientRect();
        eyes.forEach(function (eye) {
            const originX = rect.left + rect.width * eye.xPct;
            const originY = rect.top + rect.height * eye.yPct;
            const angle = Math.atan2(mouseY - originY, mouseX - originX) * (180 / Math.PI);
            eye.el.style.transform = `rotate(${angle}deg)`;
        });
    }

    document.addEventListener('mousemove', function (event) {
        pointAt(event.clientX, event.clientY);
    });
})();