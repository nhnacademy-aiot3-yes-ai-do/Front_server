package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse;

import java.util.List;
import java.util.Map;

public record CultivationListPageData(
        List<CultivationSummaryResponse> cultivations,
        List<MushroomReferenceInfoResponse> mushrooms,
        Map<Long, List<LatestSensorValueResponse>> latestSensorValuesByCultivationId
) {
    public CultivationListPageData {
        cultivations = cultivations == null ? List.of() : List.copyOf(cultivations);
        mushrooms = mushrooms == null ? List.of() : List.copyOf(mushrooms);
        latestSensorValuesByCultivationId = latestSensorValuesByCultivationId == null
                ? Map.of() : Map.copyOf(latestSensorValuesByCultivationId);
    }

    public CultivationListPageData(List<CultivationSummaryResponse> cultivations,
                                   List<MushroomReferenceInfoResponse> mushrooms) {
        this(cultivations, mushrooms, Map.of());
    }
}
