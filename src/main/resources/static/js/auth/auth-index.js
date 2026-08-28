// 쿠키에서 accessToken 읽기 시도
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

const token = getCookie('accessToken');
if (token) {
    document.getElementById('tokenDisplay').innerText = token.substring(0, 35) + '... (보안 보관 중)';
}
