package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import jakarta.validation.Valid;

import java.util.List;

public record MushroomReferenceRequest(
        String mushroomNameKo,
        String mushroomNameEn,
        String mushroomScientificName,
        List<@Valid MushroomReferenceThresholdRequest> thresholds
) {
}
