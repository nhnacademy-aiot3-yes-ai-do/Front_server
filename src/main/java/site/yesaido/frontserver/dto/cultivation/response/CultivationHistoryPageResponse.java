package site.yesaido.frontserver.dto.cultivation.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CultivationHistoryPageResponse(
        List<CultivationHistoryResponse> content,
        int totalPages,
        long totalElements,
        int number,
        int size
) {
}
