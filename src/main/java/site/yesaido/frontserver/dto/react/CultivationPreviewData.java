package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;

public record CultivationPreviewData(
        CultivationDetailResponse cultivation,
        Long growthDays,
        PhotoResponse newestPhoto,
        CultivationSensorListResponse sensors,
        LatestSensorValueListResponse latestSensorValues
) {
}
