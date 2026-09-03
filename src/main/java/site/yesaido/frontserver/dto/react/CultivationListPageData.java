package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse;

import java.util.List;
import java.util.Map;

public record CultivationListPageData(
        List<CultivationSummaryResponse> cultivations,
        List<MushroomReferenceInfoResponse> mushrooms,
        Map<Long, List<LatestSensorValueResponse>> latestSensorValuesByCultivationId,
        Map<Long, List<LatestSensorValueResponse>> sensorTrend1hByCultivationId
) {
    public CultivationListPageData {
        cultivations = cultivations == null ? List.of() : List.copyOf(cultivations);
        mushrooms = mushrooms == null ? List.of() : List.copyOf(mushrooms);
        latestSensorValuesByCultivationId = latestSensorValuesByCultivationId == null
                ? Map.of() : Map.copyOf(latestSensorValuesByCultivationId);
        sensorTrend1hByCultivationId = sensorTrend1hByCultivationId == null
                ? Map.of() : Map.copyOf(sensorTrend1hByCultivationId);
    }

    public CultivationListPageData(List<CultivationSummaryResponse> cultivations,
                                   List<MushroomReferenceInfoResponse> mushrooms) {
        this(cultivations, mushrooms, Map.of(), Map.of());
    }
}
