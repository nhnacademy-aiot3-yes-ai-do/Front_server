package site.yesaido.frontserver.dto.notification.response;

import java.util.List;

public record NotificationEventTypeListResponse(
        List<NotificationEventTypeResponse> notificationEventTypeResponses
) {}
