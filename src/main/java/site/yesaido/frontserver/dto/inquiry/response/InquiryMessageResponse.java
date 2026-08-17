package site.yesaido.frontserver.dto.inquiry.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InquiryMessageResponse(
        Long id,
        Long preId,
        String content,
        String answerContent,
        LocalDateTime createdAt
) {
}
