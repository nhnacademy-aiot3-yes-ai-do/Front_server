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