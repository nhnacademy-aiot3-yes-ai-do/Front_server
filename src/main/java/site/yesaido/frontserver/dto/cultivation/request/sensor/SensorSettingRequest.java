package site.yesaido.frontserver.dto.cultivation.request.sensor;

import java.math.BigDecimal;

public record SensorSettingRequest(
        Long sensorTypeId,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax
) {
}
