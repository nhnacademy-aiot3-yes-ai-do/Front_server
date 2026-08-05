package site.yesaido.frontserver.dto.user.request;


public record LoginRequest (
        String email,
        String password
){}

