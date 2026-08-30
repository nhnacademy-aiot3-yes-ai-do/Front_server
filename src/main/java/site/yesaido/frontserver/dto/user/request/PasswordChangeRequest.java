package site.yesaido.frontserver.dto.user.request;

public record PasswordChangeRequest(
        String currentPassword,
        String newPassword
) {
}
