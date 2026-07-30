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
