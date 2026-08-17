package site.yesaido.frontserver.dto.inquiry.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InquirySummaryPageResponse(
        List<InquirySummaryResponse> content,
        Integer totalPages,
        Long totalElements,
        Integer number,
        Integer size
) {
}
