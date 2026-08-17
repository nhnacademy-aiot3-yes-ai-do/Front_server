package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import java.time.LocalDateTime;

public record CultivationFinishResponse(
        Long cultivationId,
        String status,
        LocalDateTime finishedAt
) {
}
