package site.yesaido.frontserver.dto.user.request;

public record ProfileUpdateRequest(
        String nickname,
        String currentPassword,
        String newPassword
) {
}
