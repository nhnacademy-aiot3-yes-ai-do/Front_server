package site.yesaido.frontserver.dto.notification.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NotificationEventTypeResponse(
        Long id,
        String code,
        String displayName,
        String description,
        String targetType
) {
}
