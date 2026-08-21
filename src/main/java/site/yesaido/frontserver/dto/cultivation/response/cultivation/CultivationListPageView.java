package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoResponse;

import java.util.List;

/**
 * 재배 목록 화면의 SSR bootstrap 계약입니다.
 * 각 재배지는 자신의 센서와 임계값을 포함하고, 전역 sensorTypes는 등록 modal의 카탈로그입니다.
 */
public record CultivationListPageView(
        List<CultivationListItemView> cultivations,
        List<SensorTypeInfoResponse> sensorTypes
) {
    public CultivationListPageView {
        cultivations = cultivations == null ? List.of() : List.copyOf(cultivations);
        sensorTypes = sensorTypes == null ? List.of() : List.copyOf(sensorTypes);
    }
}
