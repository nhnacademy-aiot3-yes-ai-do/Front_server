package site.yesaido.frontserver.dto.notification.request;

import jakarta.validation.constraints.NotBlank;

public record NotificationTemplateRequest(
        Long eventTypeId,
        Long channelTypeId,
        @NotBlank
        String bodyTemplate,
        Integer version) {
}
