package site.yesaido.frontserver.dto.cultivation.request.sensor;

import java.math.BigDecimal;

public record SensorValidationRequest(
        Long cultivationId,
        Long sensorTypeId,
        String sensorTypeName,
        String sensorUnit,
        BigDecimal userMin,
        BigDecimal userMax
) {
}
