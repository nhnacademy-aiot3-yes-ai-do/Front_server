package site.yesaido.frontserver.dto.notification.response;
public record NotificationTemplateResponse(
        Long id,
        Long eventTypeId,
        String eventTypeCode,
        Long channelTypeId,
        String channelCode,
        String bodyTemplate,
        int version
) {}
