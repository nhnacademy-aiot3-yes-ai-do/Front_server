package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record CultivationSensorListResponse(
        List<CultivationSensorResponse> sensors,
        List<EnvironmentSettingResponse> environmentSettings
) {
}
