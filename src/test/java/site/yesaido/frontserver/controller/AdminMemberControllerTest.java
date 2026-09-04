package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.controller.admin.AdminMemberController;
import site.yesaido.frontserver.dto.user.response.MemberSummaryPageResponse;
import site.yesaido.frontserver.dto.user.response.MemberSummaryResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        value = AdminMemberController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class AdminMemberControllerTest {
    private static final Cookie ACCESS_TOKEN = new Cookie("accessToken", "demo-access-token");
    private static final Cookie ADMIN_ROLE = new Cookie("role", "ADMIN");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @Test
    @DisplayName("회원 목록 조회 - status 기본값(active)")
    void getMembers_defaultStatus_success() throws Exception {
        MemberSummaryResponse member = new MemberSummaryResponse(
                1L, "닉네임", "nick@test.com", LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now(), null);
        MemberSummaryPageResponse page = new MemberSummaryPageResponse(List.of(member), 1, 1L, 0, 8);

        when(userClient.getMembers(eq("active"), any(Pageable.class)))
                .thenReturn(new ApiResponse<>(true, "회원 목록입니다.", page));

        mockMvc.perform(get("/admin/members/list").cookie(ACCESS_TOKEN, ADMIN_ROLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].nickname").value("닉네임"));

        verify(userClient).getMembers(eq("active"), any(Pageable.class));
    }

    @Test
    @DisplayName("회원 목록 조회 - status=withdrawn 전달")
    void getMembers_withdrawn_success() throws Exception {
        MemberSummaryResponse withdrawn = new MemberSummaryResponse(
                2L, "탈퇴닉네임", "bye@test.com", LocalDateTime.now(), LocalDateTime.now(), null, LocalDateTime.now());
        MemberSummaryPageResponse page = new MemberSummaryPageResponse(List.of(withdrawn), 1, 1L, 0, 8);

        when(userClient.getMembers(eq("withdrawn"), any(Pageable.class)))
                .thenReturn(new ApiResponse<>(true, "회원 목록입니다.", page));

        mockMvc.perform(get("/admin/members/list").param("status", "withdrawn").cookie(ACCESS_TOKEN, ADMIN_ROLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].nickname").value("탈퇴닉네임"));

        verify(userClient).getMembers(eq("withdrawn"), any(Pageable.class));
    }

    @Test
    @DisplayName("회원 목록 조회 - page/size 쿼리 파라미터가 Pageable로 전달된다")
    void getMembers_pageAndSizeParams_success() throws Exception {
        MemberSummaryPageResponse page = new MemberSummaryPageResponse(List.of(), 3, 20L, 1, 8);

        when(userClient.getMembers(eq("active"), any(Pageable.class)))
                .thenReturn(new ApiResponse<>(true, "회원 목록입니다.", page));

        mockMvc.perform(get("/admin/members/list").param("page", "1").param("size", "8").cookie(ACCESS_TOKEN, ADMIN_ROLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPages").value(3));
    }

    @Test
    @DisplayName("PUT /admin/members/{memberId}/dormant-release - 휴면 회원 해제 요청을 User 서버로 전달한다")
    void releaseDormantMember_success() throws Exception {
        when(userClient.releaseDormantMember(1L))
                .thenReturn(new ApiResponse<>(true, "휴면 계정을 해제했습니다.", null));

        mockMvc.perform(put("/admin/members/1/dormant-release")
                        .cookie(ACCESS_TOKEN, ADMIN_ROLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("휴면 계정을 해제했습니다."));

        verify(userClient).releaseDormantMember(1L);
    }

    @Test
    @DisplayName("DELETE /admin/members/{memberId} - 강제 탈퇴 요청을 User 서버로 전달한다")
    void forceWithdraw_success() throws Exception {
        when(userClient.forceWithdraw(1L))
                .thenReturn(new ApiResponse<>(true, "회원을 강제 탈퇴했습니다.", null));

        mockMvc.perform(delete("/admin/members/1")
                        .cookie(ACCESS_TOKEN, ADMIN_ROLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원을 강제 탈퇴했습니다."));

        verify(userClient).forceWithdraw(1L);
    }
}
