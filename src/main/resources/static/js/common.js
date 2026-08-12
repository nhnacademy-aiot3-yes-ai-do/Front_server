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

// ===== 로그인 세션 남은시간 타이머 + 연장하기 =====
// accessTokenExpiresAt 쿠키(httpOnly 아님, 로그인 시 서버가 심어둠)를 읽어서
// 남은 시간을 매초 갱신함. 로그인 안 한 상태(쿠키 없음)면 그냥 숨겨둠.
function getCookieValue(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

var sessionTimerInterval = null;

function initTopbarSessionTimer() {
    var sessionEl = document.getElementById('topbar-session');
    var timerEl = document.getElementById('topbar-session-timer');
    if (!sessionEl || !timerEl) return;

    var expiresAtRaw = getCookieValue('accessTokenExpiresAt');
    if (!expiresAtRaw) return; // 비로그인 상태(관리자 로그인 포함) - 표시 안 함

    sessionEl.style.display = 'flex';

    function tick() {
        var expiresAt = Number(getCookieValue('accessTokenExpiresAt'));
        if (!expiresAt) {
            clearInterval(sessionTimerInterval);
            sessionEl.style.display = 'none';
            return;
        }

        var remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            timerEl.textContent = '0:00';
            clearInterval(sessionTimerInterval);
            alert('로그인이 만료되었어요. 다시 로그인해주세요.');
            location.href = '/login';
            return;
        }

        var totalSeconds = Math.floor(remainingMs / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        timerEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        sessionEl.classList.toggle('session-warning', remainingMs <= 5 * 60 * 1000);
        // 로그인 연장하기 버튼은 만료 10분 이하로 남았을 때만 노출
        sessionEl.classList.toggle('session-extend-visible', remainingMs <= 10 * 60 * 1000);
    }

    tick();
    sessionTimerInterval = setInterval(tick, 1000);
}

function extendLoginSession() {
    var btn = document.getElementById('topbar-session-extend');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '연장 중...';
    }

    fetch('/users/reissue', { method: 'POST' })
        .then(function (res) {
            if (!res.ok) throw new Error('reissue failed');
            return res.json();
        })
        .then(function () {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '로그인 연장하기';
            }
        })
        .catch(function () {
            alert('로그인 연장에 실패했어요. 다시 로그인해주세요.');
            location.href = '/login';
        });
}

document.addEventListener('DOMContentLoaded', initTopbarSessionTimer);
