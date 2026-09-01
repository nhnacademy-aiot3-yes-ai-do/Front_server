package site.yesaido.frontserver.dto.user.request;

public record SignupFormRequest(
        String email,
        String password,
        String nickname
) {
}
