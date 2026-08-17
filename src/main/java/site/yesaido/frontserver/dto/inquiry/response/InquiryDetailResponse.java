package site.yesaido.frontserver.dto.inquiry.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;

import java.time.LocalDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InquiryDetailResponse(
        Long id,
        Long userId,
        String userNickname,
        Long categoryId,
        String categoryName,
        String title,
        InquiryStatus status,
        LocalDateTime createdAt,
        Long cultivationId,
        String cultivationName,
        List<InquiryMessageResponse> messages
) {
}
