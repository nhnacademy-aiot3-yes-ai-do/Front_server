package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record CultivationSensorListResponse(
        List<CultivationSensorResponse> sensors,
        List<EnvironmentSettingResponse> environmentSettings
) {
    public CultivationSensorListResponse {
        sensors = sensors == null ? List.of() : List.copyOf(sensors);
        environmentSettings = environmentSettings == null ? List.of() : List.copyOf(environmentSettings);
    }
}
