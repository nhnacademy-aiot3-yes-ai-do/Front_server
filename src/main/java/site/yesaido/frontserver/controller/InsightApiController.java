package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightCandidateResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightDetailResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@Slf4j
@LoginRequired
@RestController
@RequestMapping("/api/insights")
@RequiredArgsConstructor
public class InsightApiController {

    private final AiClient aiClient;

    // 우수 수확 추천 카드 목록 조회 중계
    @GetMapping("/candidates")
    public ApiResponse<List<InsightCandidateResponse>> getCandidates(
            @RequestParam("cultivationId") Long cultivationId
    ) {
        log.info("인사이트 추천 목록 요청 - cultivationId: {}", cultivationId);
        return aiClient.getInsightCandidates(cultivationId);
    }

    // 인사이트 상세 및 타임라인 조회 중계
    @GetMapping("/{insightId}")
    public ApiResponse<InsightDetailResponse> getDetail(
            @PathVariable("insightId") Long insightId,
            @RequestParam(value = "targetDate", required = false) String targetDate
    ) {
        log.info("인사이트 상세 요청 - insightId: {}, targetDate: {}", insightId, targetDate);
        return aiClient.getInsightDetail(insightId, targetDate);
    }
}
