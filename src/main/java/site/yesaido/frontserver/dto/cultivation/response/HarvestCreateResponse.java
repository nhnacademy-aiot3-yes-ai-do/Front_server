package site.yesaido.frontserver.dto.cultivation.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HarvestCreateResponse(
        Long harvestId,
        BigDecimal harvestWeight,
        LocalDateTime harvestedAt,
        BigDecimal productScore,
        String productGrade
) {
}
