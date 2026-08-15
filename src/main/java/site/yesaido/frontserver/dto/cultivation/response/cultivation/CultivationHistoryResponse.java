package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CultivationHistoryResponse(
    Long cultivationId,
    String name,
    Long mushroomId,
    String status,
    BigDecimal harvestWeight,
    String productGrade,
    LocalDateTime finishedAt
) {
}
