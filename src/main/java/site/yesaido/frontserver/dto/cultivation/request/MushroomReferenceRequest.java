package site.yesaido.frontserver.dto.cultivation.request;

import java.util.List;

public record MushroomReferenceRequest(
        String mushroomNameKo,
        String mushroomNameEn,
        String mushroomScientificName,
        List<MushroomReferenceThresholdRequest> thresholds
) {
}
