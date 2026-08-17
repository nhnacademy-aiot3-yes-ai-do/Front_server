package site.yesaido.frontserver.dto.cultivation.request.cultivation;

public record CultivationCreateRequest(
    String name,
    Long mushroomId
) {
}
