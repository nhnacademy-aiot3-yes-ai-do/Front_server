function handleLogout() {
    fetch('/users/token/logout', { method: 'POST' }).finally(function () {
        location.href = '/login';
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('is-open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('is-open');
}

// 아직 백엔드 연동 전인 버튼(알림, 회원 추가, 회원 수정/삭제 등)에 임시로 붙여두는 핸들러.
// 아무 반응 없이 죽은 버튼처럼 보이는 것보다, 아직 준비 중이라는 걸 명확히 알려주기 위함.
function adminComingSoon() {
    alert('아직 연결된 기능이 없어요. 곧 지원할게요!');
}
