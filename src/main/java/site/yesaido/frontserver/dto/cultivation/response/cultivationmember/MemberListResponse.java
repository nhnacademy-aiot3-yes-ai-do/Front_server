package site.yesaido.frontserver.dto.cultivation.response.cultivationmember;

import java.util.List;

public record MemberListResponse(
        List<MemberResponse> memberResponses
) {
    public MemberListResponse {
        memberResponses = memberResponses == null ? List.of() : List.copyOf(memberResponses);
    }
}
