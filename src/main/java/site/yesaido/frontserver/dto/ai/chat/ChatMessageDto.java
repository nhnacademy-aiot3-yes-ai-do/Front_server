package site.yesaido.frontserver.dto.ai.chat;

import java.time.LocalDateTime;

public record ChatMessageDto(
        Long id,
        String role,
        String content,
        Long sequenceNumber,
        LocalDateTime createdAt
) {
}
