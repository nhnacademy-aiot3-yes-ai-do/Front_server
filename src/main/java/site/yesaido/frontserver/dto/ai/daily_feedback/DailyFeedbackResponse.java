package site.yesaido.frontserver.dto.ai.daily_feedback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DailyFeedbackResponse(
        Long dailyFeedbackId,
        Long cultivationId,
        LocalDate feedbackDate,
        boolean hasVisionAnalysis,
        String content,
        LocalDateTime createdAt
) {
}
