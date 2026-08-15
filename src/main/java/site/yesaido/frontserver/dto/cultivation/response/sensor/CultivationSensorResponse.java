package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record CultivationSensorResponse(
        Long sensorId,
        String deviceEui,
        String deviceModel,
        String deviceName,
        String location,
        String locationDetail,
        String sensorStatus,
        List<CultivationSensorTypeResponse> sensorTypes
) {
}
