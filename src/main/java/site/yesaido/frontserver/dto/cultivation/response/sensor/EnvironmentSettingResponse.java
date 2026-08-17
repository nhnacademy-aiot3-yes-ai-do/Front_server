package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.math.BigDecimal;

public record EnvironmentSettingResponse(
        Long sensorTypeId,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax
) {
}
