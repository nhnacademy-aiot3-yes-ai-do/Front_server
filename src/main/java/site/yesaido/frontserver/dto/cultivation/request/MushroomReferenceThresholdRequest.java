package site.yesaido.frontserver.dto.cultivation.request;

import java.math.BigDecimal;

public record MushroomReferenceThresholdRequest(
        Long id,
        Long sensorTypeId,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax
) {
}
