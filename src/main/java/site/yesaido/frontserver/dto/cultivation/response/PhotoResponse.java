package site.yesaido.frontserver.dto.cultivation.response;

import java.time.LocalDateTime;

public record PhotoResponse(
        Long photoId,
        String objectKey,
        String uri,
        String storageType,
        LocalDateTime updatedAt
) {
}
