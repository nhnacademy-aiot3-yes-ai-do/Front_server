package site.yesaido.frontserver.dto.cultivation.response.mushroom;

import java.util.List;

public record MushroomReferenceInfoListResponse(
        List<MushroomReferenceInfoResponse> mushroomReferenceInfoResponses
) {
}
