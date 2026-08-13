package site.yesaido.frontserver.dto.user.request;

public record GoogleLoginRequest(
        String idToken,
        String email,
        String nickName
) {
}
