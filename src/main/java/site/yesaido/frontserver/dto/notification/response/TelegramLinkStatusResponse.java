package site.yesaido.frontserver.dto.notification.response;

import java.util.UUID;

public record TelegramLinkStatusResponse(
        UUID sessionId,
        String status
) {
}
