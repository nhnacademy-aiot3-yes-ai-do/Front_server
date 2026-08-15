package site.yesaido.frontserver.dto.cultivation.response;

import java.util.List;

public record MushroomReferenceInfoListResponse(
        List<MushroomReferenceInfoResponse> mushroomReferenceInfoResponses
) {
}
