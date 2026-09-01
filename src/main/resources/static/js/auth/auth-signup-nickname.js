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

const avatarInput = document.getElementById("avatar");
const avatarPreview = document.getElementById("avatar-preview");
const avatarPlaceholder = document.getElementById("avatar-placeholder");

let previewObjectUrl;

avatarInput?.addEventListener("change", function () {
    const file = this.files?.[0];

    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = undefined;
    }

    if (!file) {
        avatarPreview.hidden = true;
        avatarPreview.removeAttribute("src");
        avatarPlaceholder.hidden = false;
        return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert("JPG, PNG, WEBP 이미지만 선택할 수 있습니다.");
        this.value = "";
        return;
    }

    previewObjectUrl = URL.createObjectURL(file);
    avatarPreview.src = previewObjectUrl;
    avatarPreview.hidden = false;
    avatarPlaceholder.hidden = true;
});
