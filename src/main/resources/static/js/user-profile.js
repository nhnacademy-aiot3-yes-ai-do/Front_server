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

function renderProfileImage(photoUrl) {
    const imageElement = document.getElementById('profile-image');
    const defaultIcon = document.getElementById('profile-default-icon');

    if (photoUrl) {
        imageElement.src = photoUrl;
        imageElement.hidden = false;
        defaultIcon.hidden = true;
        return;
    }

    imageElement.removeAttribute('src');
    imageElement.hidden = true;
    defaultIcon.hidden = false;
}

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
        renderProfileImage(user.photoUrl);

        document.getElementById('profile-view-nickname').textContent = user.nickname || '';
        document.getElementById('profile-view-nickname-row').textContent = user.nickname || '';
        document.getElementById('profile-view-email').textContent = user.email || '';
        document.getElementById('profile-view-joined-at').textContent = user.createdAt ? user.createdAt.substring(0, 10) : '';
        document.getElementById('profile-view-updated-at').textContent = user.updatedAt ? user.updatedAt.substring(0, 10) : '';

        if (user.hasPassword === false) {
            document.getElementById('change-password-button').style.display = 'none';
        }
    } catch {
        location.href = '/login';
    }
});

function showProfilePanel(id) {
    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startProfileEdit() {
    document.getElementById('profile-edit-nickname').value =
        document.getElementById('profile-view-nickname').textContent;

    hideError(document.getElementById('profile-edit-error'));
    showProfilePanel('profile-edit');
}

function startPasswordChange() {
    document.getElementById('password-change-current').value = '';
    document.getElementById('password-change-new').value = '';
    document.getElementById('password-change-confirm').value = '';

    hideError(document.getElementById('password-change-error'));
    showProfilePanel('password-change');
}

async function savePasswordChange() {
    const currentPassword = document.getElementById('password-change-current').value;
    const newPassword = document.getElementById('password-change-new').value;
    const confirmPassword = document.getElementById('password-change-confirm').value;
    const errorEl = document.getElementById('password-change-error');

    if (!currentPassword || !newPassword || !confirmPassword) {
        showError(errorEl, '모든 항목을 입력해주세요.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError(errorEl, '새 비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        const res = await fetch('/users/mypage/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            showError(errorEl, result.message || '비밀번호 변경에 실패했습니다.');
            return;
        }

        alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
        location.href = '/login';
    } catch {
        showError(errorEl, '서버 통신 중 오류가 발생했습니다.');
    }
}


function cancelProfileEdit() {
    showProfilePanel('profile-view');
}

async function saveProfileEdit() {
    const nickname = document.getElementById('profile-edit-nickname').value.trim();
    const errorEl = document.getElementById('profile-edit-error');

    if (!nickname) {
        showError(errorEl, '닉네임을 입력해주세요.');
        return;
    }

    try {
        const res = await fetch('/users/mypage', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            showError(errorEl, result.message || '수정에 실패했습니다.');
            return;
        }

        alert('회원정보가 수정되었습니다.');
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
        const res = await fetch('/users/withdraw', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: input })
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
            showError(
                errorEl,
                result.message || result.detail || '회원 탈퇴에 실패했습니다.'
            );
            return;
        }

        alert('회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.');
        location.href = '/login';

    } catch {
        showError(errorEl, '비밀번호 확인 중 오류가 발생했습니다.');
    }
}

async function uploadProfileImage(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('JPG, PNG, WEBP 이미지 파일만 업로드할 수 있습니다.');
        event.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/users/mypage/profile-image', {
            method: 'PUT',
            body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || '프로필 사진 업로드에 실패했습니다.');
            return;
        }

        const profileResponse = await fetch('/users/mypage');
        const profileResult = await profileResponse.json();

        if (!profileResponse.ok || !profileResult.success) {
            alert('사진은 업로드됐지만 화면 갱신에 실패했습니다. 새로고침해주세요.');
            return;
        }

        renderProfileImage(profileResult.data.photoUrl);
        renderHeaderProfileImage(profileResult.data.photoUrl);
        alert('프로필 사진이 변경되었습니다.');
    } catch {
        alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
        event.target.value = '';
    }
}
