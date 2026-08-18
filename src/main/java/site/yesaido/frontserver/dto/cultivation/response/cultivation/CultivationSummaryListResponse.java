package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import java.util.List;

public record CultivationSummaryListResponse(
        List<CultivationSummaryResponse> cultivationSummaryResponses
) {
    public CultivationSummaryListResponse {
        cultivationSummaryResponses = cultivationSummaryResponses == null ? List.of() : List.copyOf(cultivationSummaryResponses);
    }
}