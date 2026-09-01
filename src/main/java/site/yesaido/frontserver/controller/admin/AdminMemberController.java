package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.response.MemberSummaryPageResponse;
import site.yesaido.frontserver.util.LoginRequired;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/members")
public class AdminMemberController {
    private final UserClient userClient;

    @GetMapping("/list")
    public ApiResponse<MemberSummaryPageResponse> getMembers(
            @RequestParam(defaultValue = "active") String status,
            @PageableDefault(size = 8, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return userClient.getMembers(status, pageable);
    }

    @PutMapping("/{memberId}/dormant-release")
    public ApiResponse<Void> releaseDormantMember(@PathVariable Long memberId) {
        return userClient.releaseDormantMember(memberId);
    }

    @DeleteMapping("/{memberId}")
    public ApiResponse<Void> forceWithdraw(@PathVariable Long memberId) {
        return userClient.forceWithdraw(memberId);
    }
}
