package site.yesaido.frontserver.dto.cultivation.response;

import java.time.LocalDateTime;

public record CultivationDetailResponse(
        Long cultivationId,
        String name,
        Long mushroomId,
        String status,
        String mode,
        String myRole,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
