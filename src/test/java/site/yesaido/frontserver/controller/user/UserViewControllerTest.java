package site.yesaido.frontserver.controller.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.util.AuthCookieProvider;

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
@Import(AuthCookieProvider.class)
class UserViewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @Test
    @DisplayName("마이페이지 요청 시 user/profile 뷰 반환")
    void myPageRequestReturnsProfileView() throws Exception {
        mockMvc.perform(get("/mypage"))
                .andExpect(status().isOk())
                .andExpect(view().name("user/profile"));
    }

    @Test
    @DisplayName("회원가입 페이지 요청 시 auth/signup 뷰 반환")
    void signupPageReturnsSignupView() throws Exception {
        mockMvc.perform(get("/signup"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup"));
    }

    @Test
    @DisplayName("로그인 페이지 요청 시 auth/login 뷰 반환")
    void loginPageReturnsLoginView() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/login"));
    }

    @Test
    @DisplayName("비밀번호 찾기 페이지 요청 시 auth/find-password 뷰 반환")
    void findPasswordPageReturnsView() throws Exception {
        mockMvc.perform(get("/find-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/find-password"));
    }

    @Test
    @DisplayName("비밀번호 재설정 페이지 요청 시 auth/reset-password 뷰 반환")
    void resetPasswordPageReturnsView() throws Exception {
        mockMvc.perform(get("/reset-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/reset-password"));
    }

    @Test
    @DisplayName("알림 설정 페이지 요청 시 user/notification-settings 뷰 반환")
    void notificationSettingsPageReturnsView() throws Exception {
        mockMvc.perform(get("/mypage/notifications"))
                .andExpect(status().isOk())
                .andExpect(view().name("user/notification-settings"));
    }

    @Test
    @DisplayName("닉네임 회원가입 페이지 요청 - 파라미터 있는 경우 분기")
    void signupNicknamePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/signup-nickname")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup-nickname"))
                .andExpect(model().attribute("email", "test@naver.com"))
                .andExpect(model().attribute("password", "nhn123!"));
    }

    @Test
    @DisplayName("닉네임 회원가입 페이지 요청 - 파라미터 없는 경우 분기")
    void signupNicknamePageReturnsViewWithoutModel() throws Exception {
        mockMvc.perform(get("/signup/nickname"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup-nickname"))
                .andExpect(model().attributeDoesNotExist("email"))
                .andExpect(model().attributeDoesNotExist("password"));
    }

    @Test
    @DisplayName("이메일 인증번호 입력 페이지 요청 - 파라미터 있는 경우 분기")
    void verifyCodePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/verify-code")
                        .param("email", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/verify-code"))
                .andExpect(model().attribute("email", "test@naver.com"));
    }

    @Test
    @DisplayName("이메일 인증번호 입력 페이지 요청 - 파라미터 없는 경우 분기")
    void verifyCodePageReturnsViewWithoutModel() throws Exception {
        mockMvc.perform(get("/verify-code"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/verify-code"))
                .andExpect(model().attributeDoesNotExist("email"));
    }
}
