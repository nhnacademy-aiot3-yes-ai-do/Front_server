let emailChecked = false;
let emailVerified = false;
let isTimerExpired = false;
let timerInterval = null;

function startTimer(durationSeconds){
    if(timerInterval){
        clearInterval(timerInterval);
    }

    isTimerExpired = false;
    document.getElementById("verify-code").disabled = false;
    const verifyBtn = document.getElementById("btn-verify-code");
    if (verifyBtn) verifyBtn.disabled = false;

    let timeLeft = durationSeconds;
    const timerText = document.getElementById("timer-text");

    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerText.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isTimerExpired = true;
            timerText.textContent = "(만료됨)";
            document.getElementById("verify-code").disabled = true;
            if (verifyBtn) verifyBtn.disabled = true;
            const statusText = document.getElementById("verify-status-text");
            statusText.textContent = "인증 시간이 만료되었어요. 다시 재발송 받아주세요.";
            statusText.style.color = "#dc2626";
        }
        timeLeft--;
    }, 1000);
}

function handleEmailChanged() {
    emailChecked = false;
    emailVerified = false;
    isTimerExpired = false;
    document.getElementById("verify-code-field").style.display = "none";
    document.getElementById("verify-code").value = "";
    document.getElementById("verify-code").disabled = false;
    const verifyBtn = document.getElementById("btn-verify-code");
    if (verifyBtn) verifyBtn.disabled = false;
}

async function handleCheckEmail() {
    const email = document.getElementById("email").value.trim();

    if (!email) {
        alert("이메일을 입력해 주세요.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("올바른 이메일 형식이 아닙니다.");
        return;
    }

    try {
        const sendResponse = await fetch(`/users/email/send?email=${encodeURIComponent(email)}`, { method: "POST" });
        if (!sendResponse.ok) {
            const errData = await sendResponse.json();
            alert(errData.message || "인증번호 발송에 실패했습니다.");
            return;
        }

        emailVerified = false;
        emailChecked = false;
        document.getElementById("verify-code-field").style.display = "block";
        alert("인증번호를 발송했어요.");
        startTimer(30);

    } catch (error) {
        console.error(error);
        alert("요청 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
}

async function handleVerifyCode() {
    const email = document.getElementById("email").value;
    const code = document.getElementById("verify-code").value;
    const statusText = document.getElementById("verify-status-text");

    if (isTimerExpired) {
        statusText.textContent = "인증 시간이 만료되었어요. 다시 재발송 받아주세요.";
        statusText.style.color = "#dc2626";
        return;
    }

    if (!code) {
        alert("인증번호를 입력해 주세요.");
        return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
        statusText.textContent = "인증번호는 숫자 6자리입니다.";
        statusText.style.color = "#dc2626";
        return;
    }

    try {
        const response = await fetch(
            `/users/signup/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
            { method: "POST" }
        );

        if (!response.ok) {
            const errData = await response.json();
            statusText.textContent = errData.message || "인증번호는 총 6자리 입니다.";
            statusText.style.color = "#dc2626";
            return;
        }

        const payload = await response.json();
        const result = payload.data;

        if (result && result.verified === true) {
            clearInterval(timerInterval);
            document.getElementById("timer-text").textContent = "";
            document.getElementById("verify-code").disabled = true;

            if (result.eligibility === "AVAILABLE") {
                emailChecked = true;
                emailVerified = true;
                statusText.textContent = "인증이 완료되었습니다. 가입을 진행해 주세요.";
                statusText.style.color = "#16a34a";
                return;
            }

            emailChecked = false;
            emailVerified = false;
            if (result.eligibility === "ALREADY_REGISTERED") {
                statusText.textContent = "이미 가입된 이메일입니다.";
            } else if (result.eligibility === "REJOIN_RESTRICTED") {
                const availableDate = result.rejoinAvailableAt
                    ? result.rejoinAvailableAt.slice(0, 10)
                    : "30일 후";
                statusText.textContent = `탈퇴 처리 후 30일 동안은 재가입할 수 없습니다. ${availableDate}부터 가능합니다.`;
            }
            statusText.style.color = "#dc2626";
        } else {
            emailVerified = false;
            emailChecked = false;
            statusText.textContent = "인증번호가 올바르지 않아요. 다시 확인해 주세요.";
            statusText.style.color = "#dc2626";
        }
    } catch (error) {
        console.error(error);
        statusText.textContent = "인증 검증 중 에러가 발생했습니다.";
        statusText.style.color = "#dc2626";
    }
}

function handleSubmit(event) {
    if (!emailChecked) {
        event.preventDefault();
        alert("이메일 중복확인을 먼저 진행해 주세요.");
        return false;
    }
    if (!emailVerified) {
        event.preventDefault();
        alert("이메일 인증을 완료해 주세요.");
        return false;
    }
    return true;
}
