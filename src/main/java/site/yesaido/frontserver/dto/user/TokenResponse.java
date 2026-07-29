package site.yesaido.frontserver.dto.user;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {
    private String type;
    private String accessToken;
    private String refreshToken;
    private Long expireIn;
}
