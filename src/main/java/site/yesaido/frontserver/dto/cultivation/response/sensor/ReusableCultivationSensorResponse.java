package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record ReusableCultivationSensorResponse(
        Long sourceCultivationId,
        String deviceEui,
        String deviceModel,
        String deviceName,
        String location,
        String locationDetail,
        List<CultivationSensorTypeResponse> sensorTypes
) {
    public ReusableCultivationSensorResponse {
        sensorTypes = sensorTypes == null ? List.of() : List.copyOf(sensorTypes);
    }
}
