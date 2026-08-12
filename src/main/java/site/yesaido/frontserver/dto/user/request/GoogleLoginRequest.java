package site.yesaido.frontserver.dto.user.request;

public record GoogleLoginRequest(
        String email,
        String nickname
) {
}
