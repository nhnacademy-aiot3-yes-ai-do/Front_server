package site.yesaido.frontserver.dto.test;

public record TotalDataRespDTO(
        Long totalCount,
        Long soldOutCount,
        Long newReviewCount,
        Long categoryCount
) {
}
