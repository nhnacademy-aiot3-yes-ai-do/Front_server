package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;

/** 재배지 행과 그 행에 속한 센서·환경 임계값을 함께 보유하는 SSR view model입니다. */
public record CultivationListItemView(
        CultivationSummaryResponse cultivation,
        CultivationSensorListResponse sensors
) {
}
