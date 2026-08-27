package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

@ValidMushroomReferenceThreshold
public record MushroomReferenceThresholdRequest(
        Long id,
        @NotNull Long sensorTypeId,
        @NotBlank @Pattern(regexp = "GROWTH|HARVEST") String thresholdType,
        BigDecimal thresholdMin,
        BigDecimal thresholdMax
) {
}
