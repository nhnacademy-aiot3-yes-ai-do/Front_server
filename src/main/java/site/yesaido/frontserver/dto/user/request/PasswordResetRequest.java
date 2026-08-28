package site.yesaido.frontserver.dto.user.request;

public record PasswordResetRequest(
        String email,
        String newPassword
) {
}
