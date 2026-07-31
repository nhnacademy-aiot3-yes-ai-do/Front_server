package site.yesaido.frontserver.dto.cultivation.request;

public record MemberAddRequest(
        Long userId,
        String role
) {
}
