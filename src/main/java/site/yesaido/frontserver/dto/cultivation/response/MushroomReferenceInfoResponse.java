package site.yesaido.frontserver.dto.cultivation.response;

import java.time.LocalDateTime;
import java.util.List;

public record MushroomReferenceInfoResponse(
        Long id,
        String mushroomNameKo,
        String mushroomNameEn,
        String mushroomScientificName,
        List<MushroomReferenceThresholdInfoResponse> thresholdInfoResponses,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
