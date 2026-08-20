package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.math.BigDecimal;

public record SensorValidationResponse(
        boolean isValid,
        String message,
        BigDecimal recommendedMin,
        BigDecimal recommendedMax
) {
}
