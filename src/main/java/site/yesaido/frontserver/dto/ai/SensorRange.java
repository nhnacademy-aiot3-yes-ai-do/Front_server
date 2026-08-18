package site.yesaido.frontserver.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SensorRange(
        Double min,
        Double max
) {
}
