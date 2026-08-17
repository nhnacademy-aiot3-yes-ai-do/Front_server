package site.yesaido.frontserver.dto.inquiry.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InquirySummaryResponse(
        Long id,
        Long userId,
        String userNickname,
        String categoryName,
        String title,
        InquiryStatus status,
        LocalDateTime createdAt
) {
}
