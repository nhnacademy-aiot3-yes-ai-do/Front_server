package site.yesaido.frontserver.dto.cultivation.request.cultivation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record EnvironmentSettingRequest(
        @NotNull
        @Positive
        Long sensorTypeId,

        @NotNull
        BigDecimal thresholdMin,

        @NotNull
        BigDecimal thresholdMax
) {
}
