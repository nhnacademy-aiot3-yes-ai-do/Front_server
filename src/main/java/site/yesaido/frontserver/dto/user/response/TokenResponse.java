package site.yesaido.frontserver.dto.user.response;

import lombok.Builder;

@Builder
public record TokenResponse (
        String accessToken,
        String refreshToken
){ }
