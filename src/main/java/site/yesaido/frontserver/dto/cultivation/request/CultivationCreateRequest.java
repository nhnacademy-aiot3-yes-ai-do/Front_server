package site.yesaido.frontserver.dto.cultivation.request;

public record CultivationCreateRequest(
    String name,
    Long mushroomId
) {
}
