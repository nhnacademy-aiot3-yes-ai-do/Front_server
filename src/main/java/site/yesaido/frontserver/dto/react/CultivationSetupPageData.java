package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;

public record CultivationSetupPageData(
        CultivationDetailResponse cultivation,
        CultivationSensorListResponse sensors
) {
}
