package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;

import java.util.List;

public record CultivationListPageData(
        List<CultivationSummaryResponse> cultivations,
        List<MushroomReferenceInfoResponse> mushrooms
) {
    public CultivationListPageData {
        cultivations = cultivations == null ? List.of() : List.copyOf(cultivations);
        mushrooms = mushrooms == null ? List.of() : List.copyOf(mushrooms);
    }
}
