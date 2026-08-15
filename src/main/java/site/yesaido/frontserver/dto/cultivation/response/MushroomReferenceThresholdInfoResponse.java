package site.yesaido.frontserver.dto.cultivation.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MushroomReferenceThresholdInfoResponse(
        SensorTypeInfoResponse sensorType,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
