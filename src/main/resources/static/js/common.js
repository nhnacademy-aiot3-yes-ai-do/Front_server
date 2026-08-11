function logout() {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';
    document.body.appendChild(form);
    form.submit();
}

function openModal(id) {
    document.getElementById(id).classList.add('is-open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('is-open');
}

// 헤더 닉네임 클릭 시 열리는 드롭다운(내 정보 보기 / 로그아웃)
function toggleTopbarProfile() {
    var el = document.getElementById('topbar-profile');
    if (!el) return;

    var isOpen = el.classList.contains('open');
    document.querySelectorAll('.topbar-profile.open').forEach(function (p) {
        p.classList.remove('open');
    });
    if (!isOpen) el.classList.add('open');
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.topbar-profile')) {
        document.querySelectorAll('.topbar-profile.open').forEach(function (p) {
            p.classList.remove('open');
        });
    }
});
