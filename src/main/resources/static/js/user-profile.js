lucide.createIcons();

const showError = (el, msg) => {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
};

const hideError = (el) => {
    if (!el) return;
    el.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/users/mypage');
        const result = await res.json();
        if (!res.ok || !result.success) {
            alert('로그인이 필요한 서비스입니다.');
            location.href = '/login';
            return;
        }
        const user = result.data;
        document.getElementById('profile-view-nickname').textContent = user.nickname || '';
        document.getElementById('profile-view-nickname-row').textContent = user.nickname || '';
        document.getElementById('profile-view-email').textContent = user.email || '';
        document.getElementById('profile-view-joined-at').textContent = user.createdAt ? user.createdAt.substring(0, 10) : '';
        document.getElementById('profile-view-updated-at').textContent = user.updatedAt ? user.updatedAt.substring(0, 10) : '';
    } catch {
        location.href = '/login';
    }
});

function showProfilePanel(id) {
    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startProfileEdit() {
    document.getElementById('profile-verify-password').value = '';
    hideError(document.getElementById('profile-verify-error'));
    showProfilePanel('profile-verify');
}

async function confirmProfilePassword() {
    const input = document.getElementById('profile-verify-password').value;
    const errorEl = document.getElementById('profile-verify-error');

    if (!input) {
        showError(errorEl, '비밀번호를 입력해주세요.');
        return;
    }

    try {
        const res = await fetch('/users/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: input })
        });
        const result = await res.json();

        if (!res.ok || !result.success || result.data !== true) {
            showError(errorEl, result.message || '비밀번호가 일치하지 않습니다.');
            return;
        }

        document.getElementById('profile-edit-nickname').value = document.getElementById('profile-view-nickname').textContent;
        document.getElementById('profile-edit-password').value = '';
        document.getElementById('profile-edit-password-confirm').value = '';
        hideError(document.getElementById('profile-edit-error'));
        showProfilePanel('profile-edit');
    } catch {
        showError(errorEl, '비밀번호 확인 중 오류가 발생했습니다.');
    }
}

function cancelProfileEdit() {
    showProfilePanel('profile-view');
}

async function saveProfileEdit() {
    const nickname = document.getElementById('profile-edit-nickname').value.trim();
    const currentPassword = document.getElementById('profile-verify-password').value;
    const newPassword = document.getElementById('profile-edit-password').value;
    const passwordConfirm = document.getElementById('profile-edit-password-confirm').value;
    const errorEl = document.getElementById('profile-edit-error');

    if (!nickname) {
        showError(errorEl, '닉네임을 입력해주세요.');
        return;
    }

    if (newPassword || passwordConfirm) {
        if (newPassword !== passwordConfirm) {
            showError(errorEl, '새 비밀번호가 일치하지 않습니다.');
            return;
        }
    }

    try {
        const res = await fetch('/users/mypage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, currentPassword, newPassword })
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
            if (res.status === 401 || result.message?.includes('로그인')) {
                alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
                location.href = '/login';
                return;
            }
            showError(errorEl, result.message || '수정에 실패했습니다.');
            return;
        }
        sessionStorage.setItem('mm_user_nickname', nickname);
        const nicknameLabel = document.getElementById('topbar-nickname-label');
        if (nicknameLabel) nicknameLabel.textContent = nickname;

        alert('프로필이 성공적으로 수정되었습니다!');
        location.reload();
    } catch {
        showError(errorEl, '서버 통신 중 오류가 발생했습니다.');
    }

}

function startProfileDelete() {
    document.getElementById('profile-delete-password').value = '';
    hideError(document.getElementById('profile-delete-error'));
    showProfilePanel('profile-delete-confirm');
}

async function confirmProfileDelete() {
    const input = document.getElementById('profile-delete-password').value;
    const errorEl = document.getElementById('profile-delete-error');

    if (!input) {
        showError(errorEl, '비밀번호를 입력해주세요.');
        return;
    }
    try {
        const res = await fetch('/users/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: input })
        });
        const result = await res.json();

        if (!res.ok || !result.success || result.data !== true) {
            showError(errorEl, result.message || '비밀번호가 일치하지 않습니다.');
            return;
        }

        await fetch('/logout', {method: 'POST'});
        alert('회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.')
        location.href = '/login';

    } catch {
        showError(errorEl, '비밀번호 확인 중 오류가 발생했습니다.');
    }

}
