async function handleVerify(event) {
    event.preventDefault();

    const email = document.getElementById("verify-email").value;
    const code = document.getElementById("code").value;

    try {
        const response = await fetch("/users/password-reset/verify-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, code })
        });

        if (!response.ok) {
            alert("인증번호 확인 중 오류가 발생했습니다.");
            return;
        }

        const verified = await response.json();

        if (!verified) {
            alert("인증번호가 일치하지 않거나 만료되었습니다.");
            return;
        }

        location.href = "/reset-password";
    } catch (error) {
        alert("인증번호 확인 중 오류가 발생했습니다.");
    }
}