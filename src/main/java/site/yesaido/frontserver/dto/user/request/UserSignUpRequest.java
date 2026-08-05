package site.yesaido.frontserver.dto.user.request;

public record UserSignUpRequest (
        String email,
        String password,
        String nickName,
        String role
){}
