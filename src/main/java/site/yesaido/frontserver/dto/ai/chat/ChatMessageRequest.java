package site.yesaido.frontserver.dto.ai.chat;

public record ChatMessageRequest(
        Long conversationId,
        Long cultivationId,
        String message,
        Long channelId
) {
}
