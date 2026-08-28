async function handleCheckNickname() {
    const nickname = document.getElementById("nickname").value;

    if (!nickname) {
        alert("닉네임을 입력해 주세요.");
        return;
    }

    const response = await fetch(`/users/check-nickname?nickname=${nickname}`);
    const isDuplicated = await response.json(); // true(중복), false(사용가능)

    if (isDuplicated) {
        alert("이미 존재하는 닉네임입니다!");
    } else {
        alert("사용 가능한 닉네임입니다!");
    }
}
