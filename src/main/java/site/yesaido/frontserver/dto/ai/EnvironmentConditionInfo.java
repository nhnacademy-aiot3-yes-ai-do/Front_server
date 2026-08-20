package site.yesaido.frontserver.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EnvironmentConditionInfo(
        SensorRange temperature,
        SensorRange humidity,
        SensorRange co2,
        SensorRange light
) {
}
