package site.yesaido.frontserver.dto.user.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MemberSummaryPageResponse(
        List<MemberSummaryResponse> memberSummaryResponse,
        Integer totalPages,
        Long totalElements,
        Integer number,
        Integer size
) {
}
