package site.yesaido.frontserver.dto.notification.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record TelegramLinkSessionResponse(
        UUID sessionId,
        String status,
        String deepLink,
        LocalDateTime expiresAt
) {
}
