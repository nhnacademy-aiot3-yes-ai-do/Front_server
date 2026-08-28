async function handleSendEmail(event) {
    event.preventDefault();

    const email = document.getElementById('verify-email').value;
    const type = document.getElementById('verify-type').value;

    try {
        const response = await fetch('/users/email/send?email=' + encodeURIComponent(email), {
            method: 'POST'
        });

        if (response.ok) {
            location.href = '/verify-code?email=' + encodeURIComponent(email) + '&type=' + encodeURIComponent(type);
        } else {
            alert('이메일 발송에 실패했습니다. 다시 시도해 주세요.');
        }
    } catch (error) {
        alert('이메일 발송 중 오류가 발생했습니다.');
    }
}
