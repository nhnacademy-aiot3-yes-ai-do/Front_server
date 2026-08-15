package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import java.math.BigDecimal;

public record MushroomReferenceThresholdRequest(
        Long id,
        Long sensorTypeId,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax
) {
}
