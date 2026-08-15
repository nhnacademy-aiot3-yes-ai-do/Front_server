package site.yesaido.frontserver.dto.cultivation.request.cultivationmember;

public record MemberAddRequest(
        Long userId,
        String role
) {
}
