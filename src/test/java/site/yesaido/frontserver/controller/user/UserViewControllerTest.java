package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.Cookie;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = UserViewController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import({AuthCookieProvider.class, ViewJsonWriter.class})
class UserViewControllerTest {
    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private NotificationClient notificationClient;

    @MockitoBean
    private CultivationClient cultivationClient;

    @MockitoBean
    private MeterRegistry meterRegistry;

    @Test
    @DisplayName("마이페이지 요청 시 user/profile 뷰 반환")
    void myPageRequestReturnsProfileView() throws Exception {
        mockMvc.perform(get("/mypage").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("회원가입 페이지 요청 시 auth/signup 뷰 반환")
    void signupPageReturnsSignupView() throws Exception {
        mockMvc.perform(get("/signup"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("로그인 페이지 요청 시 auth/login 뷰 반환")
    void loginPageReturnsLoginView() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("비밀번호 찾기 페이지 요청 시 auth/find-password 뷰 반환")
    void findPasswordPageReturnsView() throws Exception {
        mockMvc.perform(get("/find-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("이메일 인증 세션 없이 비밀번호 재설정 페이지에 접근하면 비밀번호 찾기로 이동")
    void resetPasswordPageRedirectsToFindPasswordWithoutVerifiedSession() throws Exception {
        mockMvc.perform(get("/reset-password"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/find-password"));
    }

    @Test
    @DisplayName("이메일 인증 세션이 있으면 비밀번호 재설정 페이지를 반환")
    void resetPasswordPageReturnsViewWithVerifiedSession() throws Exception {
        mockMvc.perform(get("/reset-password")
                        .sessionAttr("passwordResetVerifiedEmail", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("알림 설정 페이지 요청 시 user/notification-settings 뷰 반환")
    void notificationSettingsPageReturnsView() throws Exception {
        when(notificationClient.getEndpoints()).thenReturn(ResponseEntity.ok(List.of()));
        when(notificationClient.getSubscriptionTypes()).thenReturn(ResponseEntity.ok(List.of()));
        when(notificationClient.getSubscriptions()).thenReturn(ResponseEntity.ok(List.of()));
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(new CultivationSummaryListResponse(List.of())));

        mockMvc.perform(get("/mypage/notifications").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"));
    }

    @Test
    @DisplayName("닉네임 회원가입 페이지 요청 - 파라미터 있는 경우 분기")
    void signupNicknamePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/signup-nickname")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"))
                .andExpect(model().attributeDoesNotExist("email", "password"));
    }

    @Test
    @DisplayName("닉네임 회원가입 페이지 요청 - 파라미터 없는 경우 분기")
    void signupNicknamePageReturnsViewWithoutModel() throws Exception {
        mockMvc.perform(get("/signup/nickname"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"))
                .andExpect(model().attributeDoesNotExist("email"))
                .andExpect(model().attributeDoesNotExist("password"));
    }

    @Test
    @DisplayName("이메일 인증번호 입력 페이지 요청 - 파라미터 있는 경우 분기")
    void verifyCodePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/verify-code")
                        .param("email", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"))
                .andExpect(model().attributeDoesNotExist("email"));
    }

    @Test
    @DisplayName("이메일 인증번호 입력 페이지 요청 - 파라미터 없는 경우 분기")
    void verifyCodePageReturnsViewWithoutModel() throws Exception {
        mockMvc.perform(get("/verify-code"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/react/index.html"))
                .andExpect(model().attributeDoesNotExist("email"));
    }
}
