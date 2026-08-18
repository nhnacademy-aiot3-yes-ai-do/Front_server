package site.yesaido.frontserver.dto.notification.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubscriptionTypeResponse(
        Long id,
        String name,
        String description,
        String eventType,
        String targetType
) {
}
