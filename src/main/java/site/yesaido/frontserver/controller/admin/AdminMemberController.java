package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;
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
}