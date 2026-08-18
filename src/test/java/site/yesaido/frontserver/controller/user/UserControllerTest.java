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
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = {UserController.class, UserViewController.class},
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private AuthCookieProvider authCookieProvider;

    @Test
    @DisplayName("회원가입 요청 성공")
    void signupSuccess() throws Exception {
        mockMvc.perform(post("/signup")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!")
                        .param("nickname", "nickTest"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).signUp(any(UserSignUpRequest.class));
    }

    @Test
    @DisplayName("로그인 요청 - 일반 유저 성공 분기")
    void loginUserSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("mockAccess")
                .refreshToken("mockRefresh")
                .role("USER")
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/login")
                        .param("email", "test@naver.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));

        verify(authCookieProvider).setAuthCookies(any(), eq("mockAccess"), eq("mockRefresh"), eq("USER"));
    }

    @Test
    @DisplayName("로그인 요청 - 관리자 유저 성공 분기")
    void loginAdminSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("mockAccess")
                .refreshToken("mockRefresh")
                .role("ADMIN")
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/login")
                        .param("email", "admin@naver.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        verify(authCookieProvider).setAuthCookies(any(), eq("mockAccess"), eq("mockRefresh"), eq("ADMIN"));
    }

    @Test
    @DisplayName("로그인 요청 - 휴면 유저 예외 전달 분기 (OCP)")
    void loginDormantUserThrowsException() throws Exception {
        given(userClient.login(any(LoginRequest.class))).willThrow(new DormantUserException("휴면계정입니다.", "test@naver.com"));

        mockMvc.perform(post("/login")
                        .param("email", "test@naver.com")
                        .param("password", "password123"))
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof DormantUserException));
    }

    @Test
    @DisplayName("로그인 요청 - 일반 실패 예외 발생 분기")
    void loginGeneralExceptionReturnsLoginError() throws Exception {
        given(userClient.login(any(LoginRequest.class))).willThrow(new RuntimeException("로그인 실패"));

        mockMvc.perform(post("/login")
                        .param("email", "test@naver.com")
                        .param("password", "wrongpass"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andExpect(flash().attributeExists("loginError"));
    }

    @Test
    @DisplayName("로그아웃 요청 - 성공 분기")
    void logoutSuccess() throws Exception {
        mockMvc.perform(post("/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).logout();
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("관리자 로그인 - 성공 분기")
    void adminLoginSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("adminAccess")
                .refreshToken("adminRefresh")
                .role("ADMIN")
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/admin/login")
                        .param("email", "admin@naver.com")
                        .param("password", "adminpass"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        verify(authCookieProvider).setAuthCookies(any(), eq("adminAccess"), eq("adminRefresh"), eq("ADMIN"));
    }

    @Test
    @DisplayName("관리자 로그인 - ADMIN 아닌 계정으로 시도 시 실패 분기")
    void adminLoginNonAdminRoleFails() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("userAccess")
                .refreshToken("userRefresh")
                .role("USER")
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/admin/login")
                        .param("email", "notadmin@naver.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/login"));
    }

    @Test
    @DisplayName("관리자 로그인 - 인증 실패 예외 분기")
    void adminLoginExceptionFails() throws Exception {
        given(userClient.login(any(LoginRequest.class))).willThrow(new RuntimeException("로그인 실패"));

        mockMvc.perform(post("/admin/login")
                        .param("email", "admin@naver.com")
                        .param("password", "wrongpass"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/login"));
    }
}