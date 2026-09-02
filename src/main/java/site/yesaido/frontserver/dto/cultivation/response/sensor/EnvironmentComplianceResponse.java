package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.math.BigDecimal;

public record EnvironmentComplianceResponse(
        BigDecimal temperatureCompliance,
        BigDecimal humidityCompliance,
        BigDecimal co2Compliance,
        BigDecimal lightCompliance
) {
}
