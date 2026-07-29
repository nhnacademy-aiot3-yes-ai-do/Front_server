package site.yesaido.frontserver.dto.user;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UserSignUpRequest {
    private String email;
    private String password;
    private String nickName;
    private String role;
}
