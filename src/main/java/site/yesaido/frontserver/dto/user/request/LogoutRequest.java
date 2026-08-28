package site.yesaido.frontserver.dto.user.request;

public record LogoutRequest(
        String refreshToken,
        String accessToken
) {
}
