package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageDto;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageRequest;
import site.yesaido.frontserver.dto.ai.chat.ChatMessageResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightCandidateResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightDetailResponse;
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

    /**
     * 유사 환경 우수 수확 추천 사례 TOP 5 조회
     */
    @GetMapping("/api/v1/ai/insights/candidates")
    ApiResponse<List<InsightCandidateResponse>> getInsightCandidates(
            @RequestParam("cultivationId") Long cultivationId
    );

    /**
     * 특정 인사이트의 상세 분석 및 일자별 환경/센서 타임라인 조회
     */
    @GetMapping("/api/v1/ai/insights/{insight-id}")
    ApiResponse<InsightDetailResponse> getInsightDetail(
            @PathVariable("insight-id") Long insightId,
            @RequestParam(value = "targetDate", required = false) String targetDate
    );
}
