package site.yesaido.frontserver.dto.user.response;

import java.time.LocalDateTime;

public record SignupEmailVerificationResponse(
        boolean verified,
        String eligibility,
        LocalDateTime rejoinAvailableAt
) {
}
