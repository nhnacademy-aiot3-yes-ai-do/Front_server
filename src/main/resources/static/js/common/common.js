function logout() {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';
    document.body.appendChild(form);
    form.submit();
}

function openModal(id) {
    // 알림/담당자 관리 같은 드롭다운 패널이 열린 채로 모달을 열면, 모달 배경이 반투명이라
    // 뒤에 있는 패널이 비쳐 보이는 문제가 있어서 모달 열 때 항상 같이 닫아줌
    document.querySelectorAll('.dropdown-panel.is-open').forEach(function (p) {
        p.classList.remove('is-open');
    });
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

// ===== 로그인 세션 남은시간 타이머 + 연장하기 =====
// accessTokenExpiresAt 쿠키(httpOnly 아님, 로그인 시 서버가 심어둠)를 읽어서
// 남은 시간을 매초 갱신함. 로그인 안 한 상태(쿠키 없음)면 그냥 숨겨둠.
function getCookieValue(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

var sessionReissueInProgress = false;
function getAccessTokenExpiresAt() {
    var raw = getCookieValue('accessTokenExpiresAt');
    var expiresAt = Number(raw);

    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
        return null;
    }

    return expiresAt;
}

// ===== 실제 Access Token 만료 시각 기반 세션 타이머 =====

var sessionTimerInterval = null;

function initTopbarSessionTimer() {
    if(sessionTimerInterval !== null){
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    }
    var sessionEl = document.getElementById('topbar-session');
    var timerEl = document.getElementById('topbar-session-timer');
    if (!sessionEl || !timerEl) return;

    if(getAccessTokenExpiresAt() === null){
        sessionEl.style.display = 'none';
        return;
    }

    sessionEl.style.display = 'flex';

    function tick() {
        var expiresAt = getAccessTokenExpiresAt();
        if (!expiresAt) {
            clearInterval(sessionTimerInterval);
            sessionEl.style.display = 'none';
            return;
        }

        var remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerEl.textContent = '0:00';

            if (!sessionReissueInProgress) {
                clearInterval(sessionTimerInterval);
                sessionTimerInterval = null;
                logout();
            }
            return;
        }

        var totalSeconds = Math.floor(remainingMs / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        timerEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        sessionEl.classList.toggle('session-warning', remainingMs <= 5 * 60 * 1000);
        // 💡 로그인 연장하기 버튼은 만료 10분 이하로 남았을 때만 노출!
        sessionEl.classList.toggle('session-extend-visible', remainingMs <= 10 * 60 * 1000);
    }

    tick();
    sessionTimerInterval = setInterval(tick, 1000);
}

function extendLoginSession() {
    if(sessionReissueInProgress){
        return;
    }
    sessionReissueInProgress = true;

    var btn = document.getElementById('topbar-session-extend');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '연장 중...';
    }

    fetch('/users/reissue', {
        method: 'POST',
        credentials: 'same-origin'
    })
        .then(function (res) {
            if (!res.ok) throw new Error('reissue failed');
            return res.json();
        })
        .then(function () {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '로그인 연장하기';
            }
            if(getAccessTokenExpiresAt() === null){
                throw new Error('accessTokenExpiresAt cookie is missing');
            }

            sessionReissueInProgress = false;
            initTopbarSessionTimer();
        })
        .catch(function () {
            sessionReissueInProgress = false;
            alert('로그인 연장에 실패했어요. 다시 로그인해주세요.');
            logout();
        });
}

// ===== 상단 헤더 닉네임 로드 (실시간 백엔드 프로필 기준) =====
function loadHeaderNickname() {
    var nicknameLabel = document.getElementById('topbar-nickname-label');
    if (!nicknameLabel) return;

    fetch('/users/mypage')
        .then(function (res) {
            if (!res.ok) throw new Error('Failed to fetch profile');
            return res.json();
        })
        .then(function (result) {
            if (result && result.data && result.data.nickname) {
                var nickname = result.data.nickname;
                nicknameLabel.textContent = nickname;
                sessionStorage.setItem('mm_user_nickname', nickname);
            }
        })
        .catch(function (err) {
            console.warn('헤더 닉네임 로드 실패:', err);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    initTopbarSessionTimer();
    loadHeaderNickname();
});
