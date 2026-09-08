package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.time.Instant;
import java.util.List;

public record CultivationSensorResponse(
        Long sensorId,
        String deviceEui,
        String deviceModel,
        String deviceName,
        String location,
        String locationDetail,
        String sensorStatus,
        Instant lastMeasuredAt,
        List<CultivationSensorTypeResponse> sensorTypes
) {
}
