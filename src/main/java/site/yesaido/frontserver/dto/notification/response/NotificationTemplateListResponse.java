package site.yesaido.frontserver.dto.notification.response;

import java.util.List;

public record NotificationTemplateListResponse(
        List<NotificationTemplateResponse> notificationTemplateResponses
) {}
