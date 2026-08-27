package site.yesaido.frontserver.dto.notification.response;

import java.time.Instant;
import java.util.UUID;

public record TelegramLinkSessionResponse(
        UUID sessionId,
        String status,
        String deepLink,
        Instant expiresAt
) {
}
