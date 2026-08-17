function handleLogout() {
    fetch('/logout', { method: 'POST' }).finally(function () {
        location.href = '/login';
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('is-open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('is-open');
}
