package site.yesaido.frontserver.dto.notification.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EndpointResponse(
        Long id,
        Long channelTypeId,
        String channelCode,
        String channelName,
        String destination,
        String displayName,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
