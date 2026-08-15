package site.yesaido.frontserver.dto.cultivation.request.sensor;

import java.util.List;

public record CreateCultivationSensorRequest(
        String deviceEui,
        String deviceModel,
        String deviceName,
        String location,
        String locationDetail,
        List<SensorSettingRequest> sensorSettings
) {
}
