package site.yesaido.frontserver.dto.user.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MemberSummaryResponse(
        Long userId,
        String nickname,
        String email,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime lastLoginAt,
        LocalDateTime deletedAt
) {
}
