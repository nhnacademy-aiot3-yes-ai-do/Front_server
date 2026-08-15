package site.yesaido.frontserver.dto.cultivation.response.cultivationmember;

import java.time.LocalDateTime;

public record MemberResponse(
        Long memberId,
        Long userId,
        String nickname,
        String role,
        LocalDateTime joinedAt
) {
}
