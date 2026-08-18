package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import java.util.List;

public record PhotoListResponse(
        List<PhotoResponse> photoUploadResponses
) {
    public PhotoListResponse {
        photoUploadResponses = photoUploadResponses == null ? List.of() : List.copyOf(photoUploadResponses);
    }
}