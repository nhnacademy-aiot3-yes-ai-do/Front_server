package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageDto;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageRequest;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@Slf4j
@LoginRequired
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatApiController {
    private final AiClient aiClient;

    @PostMapping
    public ApiResponse<ChatMessageResponse> chat(@RequestBody ChatMessageRequest request) {
        log.info("프론트 챗봇 요청 중계 - cultivationId: {}", request.cultivationId());
        return aiClient.chat(request);
    }

    @GetMapping("/history")
    public ApiResponse<List<ChatMessageDto>> getHistory(@RequestParam("conversationId") Long conversationId) {
        return aiClient.getChatHistory(conversationId);
    }
}
