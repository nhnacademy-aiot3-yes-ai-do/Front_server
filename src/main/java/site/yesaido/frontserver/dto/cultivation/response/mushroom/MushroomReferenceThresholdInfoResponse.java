package site.yesaido.frontserver.dto.cultivation.response.mushroom;

import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MushroomReferenceThresholdInfoResponse(
        Long id,
        SensorTypeInfoResponse sensorType,
        String thresholdType,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
