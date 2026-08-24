package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.time.Instant;

public record SensorTrendPointResponse(
        Instant measuredAt,
        Double value
) {
}
