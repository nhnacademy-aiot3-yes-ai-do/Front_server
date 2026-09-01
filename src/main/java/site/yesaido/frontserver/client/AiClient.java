package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageDto;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageRequest;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageResponse;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorValidationRequest;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorValidationResponse;

import java.util.List;

@FeignClient(name = "aiClient", url = "${feign.client.gateway.url}")
public interface AiClient {


    @GetMapping("/api/v1/mushrooms/{mushroom-id}/guide")
    ApiResponse<MushGuideResponse> getMushroomGuide(@PathVariable("mushroom-id") Long mushroomId);

    @PostMapping("/api/v1/ai/cultivations/{cultivation-id}/sensor-validation")
    ApiResponse<SensorValidationResponse> validationSensorThreshold(
            @PathVariable("cultivation-id") Long cultivationId,
            @RequestBody SensorValidationRequest request);

    @PostMapping("/api/v1/ai/chat")
    ApiResponse<ChatMessageResponse> chat(@RequestBody ChatMessageRequest request);

    @GetMapping("/api/v1/ai/chat/history")
    ApiResponse<List<ChatMessageDto>> getChatHistory(
            @RequestParam(value = "conversationId", required = false) Long conversationId,
            @RequestParam(value = "cultivationId", required = false) Long cultivationId
    );
}
