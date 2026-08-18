package site.yesaido.frontserver.dto.cultivation.response.mushroom;

import java.util.List;

public record MushroomReferenceInfoListResponse(
        List<MushroomReferenceInfoResponse> mushroomReferenceInfoResponses
) {
    public MushroomReferenceInfoListResponse {
        mushroomReferenceInfoResponses = mushroomReferenceInfoResponses == null ? List.of() : List.copyOf(mushroomReferenceInfoResponses);
    }
}
