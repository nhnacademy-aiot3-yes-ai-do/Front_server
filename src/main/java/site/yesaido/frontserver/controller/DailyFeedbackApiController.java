package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.daily_feedback.DailyFeedbackResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.time.LocalDate;

@Slf4j
@LoginRequired
@RestController
@RequestMapping("/api/cultivations")
@RequiredArgsConstructor
public class DailyFeedbackApiController {

    private final AiClient aiClient;

    @GetMapping("/{cultivation-id}/daily-feedbacks/{feedback-date}")
    public ApiResponse<DailyFeedbackResponse> getDailyFeedback(
            @PathVariable("cultivation-id") Long cultivationId,
            @PathVariable("feedback-date")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate feedbackDate
    ) {
        log.info("일일 피드백 요청 - cultivationId: {}, feedbackDate: {}", cultivationId, feedbackDate);
        return aiClient.getDailyFeedback(cultivationId, feedbackDate);
    }
}
