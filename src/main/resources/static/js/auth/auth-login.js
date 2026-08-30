lucide.createIcons();

var dormantTimerInterval = null;
var dormantTimerExpired = false;
var dormantCurrentEmail = '';

function showDormantStep(step) {
    document.getElementById('dormant-step-notice').style.display = step === 'notice' ? 'block' : 'none';
    document.getElementById('dormant-step-code').style.display = step === 'code' ? 'block' : 'none';
    document.getElementById('dormant-step-success').style.display = step === 'success' ? 'block' : 'none';
}

function openDormantModal(email) {
    dormantCurrentEmail = email || '';
    document.getElementById('dormant-email').value = dormantCurrentEmail;
    document.getElementById('dormant-email-echo').textContent = dormantCurrentEmail;
    document.getElementById('dormant-code').value = '';
    document.getElementById('dormant-status-text').textContent = '';
    document.getElementById('dormant-send-btn').disabled = false;
    document.getElementById('dormant-send-btn').textContent = '인증번호 받기';
    showDormantStep('notice');
    openModal('modal-dormant');
}

function closeDormantModal() {
    if (dormantTimerInterval) clearInterval(dormantTimerInterval);
    closeModal('modal-dormant');
}

function startDormantTimer(durationSeconds) {
    if (dormantTimerInterval) clearInterval(dormantTimerInterval);

    dormantTimerExpired = false;
    var codeInput = document.getElementById('dormant-code');
    var verifyBtn = document.getElementById('dormant-verify-btn');
    codeInput.disabled = false;
    verifyBtn.disabled = false;

    var timeLeft = durationSeconds;
    var timerText = document.getElementById('dormant-timer-text');

    dormantTimerInterval = setInterval(function () {
        var minutes = Math.floor(timeLeft / 60);
        var seconds = timeLeft % 60;
        timerText.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        if (timeLeft <= 0) {
            clearInterval(dormantTimerInterval);
            dormantTimerExpired = true;
            timerText.textContent = '(만료됨)';
            codeInput.disabled = true;
            verifyBtn.disabled = true;
            var statusText = document.getElementById('dormant-status-text');
            statusText.textContent = '인증 시간이 만료되었어요. 재발송을 눌러주세요.';
            statusText.classList.add('error');
        }
        timeLeft--;
    }, 1000);
}

function handleDormantSendCode() {
    var btn = document.getElementById('dormant-send-btn');
    btn.disabled = true;
    btn.textContent = '발송 중...';

    fetch('/users/email/send?email=' + encodeURIComponent(dormantCurrentEmail), { method: 'POST' })
        .then(function (res) {
            if (!res.ok) throw new Error('이메일 발송 실패');
            showDormantStep('code');
            document.getElementById('dormant-status-text').textContent = '';
            document.getElementById('dormant-status-text').classList.remove('error');
            startDormantTimer(30);
        })
        .catch(function (err) {
            alert('인증번호 발송 실패: ' + err.message);
            btn.disabled = false;
            btn.textContent = '인증번호 받기';
        });
}

function handleDormantResend() {
    document.getElementById('dormant-code').value = '';
    var statusText = document.getElementById('dormant-status-text');
    statusText.textContent = '인증번호를 다시 보냈어요.';
    statusText.classList.remove('error');

    fetch('/users/email/send?email=' + encodeURIComponent(dormantCurrentEmail), { method: 'POST' })
        .then(function (res) {
            if (!res.ok) throw new Error('재발송 실패');
            startDormantTimer(30);
        })
        .catch(function (err) {
            statusText.textContent = '인증번호 재발송 실패: ' + err.message;
            statusText.classList.add('error');
        });
}

function handleDormantVerifyCode() {
    var code = document.getElementById('dormant-code').value.trim();
    var statusText = document.getElementById('dormant-status-text');

    if (dormantTimerExpired) {
        statusText.textContent = '인증 시간이 만료되었어요. 재발송을 눌러주세요.';
        statusText.classList.add('error');
        return;
    }

    if (!/^\d{6}$/.test(code)) {
        statusText.textContent = '인증번호는 숫자 6자리입니다.';
        statusText.classList.add('error');
        return;
    }

    fetch('/users/email/verify?email=' + encodeURIComponent(dormantCurrentEmail) + '&code=' + encodeURIComponent(code), { method: 'POST' })
        .then(function (res) {
            if (!res.ok) throw new Error('인증번호 불일치');
            return res.json();
        })
        .then(function (isSuccess) {
            if (!isSuccess) throw new Error('인증번호가 올바르지 않습니다.');

            statusText.classList.remove('error');
            statusText.textContent = '인증되었습니다. 계정을 복구하는 중이에요...';

            return fetch('/users/dormant/release?email=' + encodeURIComponent(dormantCurrentEmail), { method: 'POST' });
        })
        .then(function (res) {
            if (!res.ok) throw new Error('휴면 해제 처리 실패');

            clearInterval(dormantTimerInterval);
            document.getElementById('dormant-timer-text').textContent = '';
            document.getElementById('dormant-code').disabled = true;
            document.getElementById('dormant-verify-btn').disabled = true;

            showDormantStep('success');
            lucide.createIcons();

            setTimeout(function () {
                alert('휴면 계정이 성공적으로 해제되었습니다! 다시 로그인해 주세요.');
                window.location.href = '/login';
            }, 1500);
        })
        .catch(function (err) {
            statusText.textContent = err.message || '휴면 해제 처리 중 오류가 발생했어요.';
            statusText.classList.add('error');
        });
}
