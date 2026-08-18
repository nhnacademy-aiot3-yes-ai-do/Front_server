package site.yesaido.frontserver.dto.cultivation.request.sensor;

import jakarta.validation.constraints.NotBlank;

public record SensorTypeRequest(
        @NotBlank
        String type,
        @NotBlank
        String valueUnit
) {
}