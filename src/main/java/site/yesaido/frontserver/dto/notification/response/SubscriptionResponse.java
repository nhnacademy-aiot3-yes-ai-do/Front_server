package site.yesaido.frontserver.dto.notification.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubscriptionResponse(
        Long id,
        Long subscriptionTypeId,
        String subscriptionName,
        String eventType,
        String targetType,
        Long targetId,
        Long endpointId,
        String channelCode,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
