package site.yesaido.frontserver.dto.ai.chat;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long conversationId,
        String reply,
        String role,
        Long sequenceNumber,
        LocalDateTime createdAt
) {
}
