package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.controller.user.UserController;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @Test
    @DisplayName("이메일 중복 확인 - 중복 아님")
    void checkEmailReturnsFalse() throws Exception {
        when(userClient.checkEmail("test@test.com")).thenReturn(false);

        mockMvc.perform(get("/users/check-email").param("email", "test@test.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("닉네임 중복 확인 - 중복임")
    void checkNicknameReturnsTrue() throws Exception {
        when(userClient.checkNickname("중복닉")).thenReturn(true);

        mockMvc.perform(get("/users/check-nickname").param("nickname", "중복닉"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("회원가입 성공 시 로그인 페이지로 리다이렉트")
    void signupRedirectsToLogin() throws Exception {
        mockMvc.perform(post("/signup")
                        .param("email", "test@test.com")
                        .param("password", "password123")
                        .param("nickname", "닉네임"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        ArgumentCaptor<UserSignUpRequest> captor = ArgumentCaptor.forClass(UserSignUpRequest.class);
        verify(userClient).signUp(captor.capture());

        UserSignUpRequest captured = captor.getValue();
        assertThat(captured.getEmail()).isEqualTo("test@test.com");
        assertThat(captured.getPassword()).isEqualTo("password123");
        assertThat(captured.getNickName()).isEqualTo("닉네임");
        assertThat(captured.getRole()).isEqualTo("USER");
    }

    @Test
    @DisplayName("로그인 성공 시 액세스/리프레시 토큰 쿠키가 설정되고 루트로 리다이렉트")
    void loginSetsCookiesAndRedirectsToRoot() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .type("Bearer")
                .accessToken("access-token-value")
                .refreshToken("refresh-token-value")
                .expireIn(3600L)
                .build();
        when(userClient.login(any(LoginRequest.class))).thenReturn(tokenResponse);

        mockMvc.perform(post("/login")
                        .param("email", "test@test.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"))
                .andExpect(cookie().value("accessToken", "access-token-value"))
                .andExpect(cookie().value("refreshToken", "refresh-token-value"));
    }

    @Test
    @DisplayName("로그인 성공 시 refreshToken이 없으면 refreshToken 쿠키는 설정 안 함")
    void loginWithoutRefreshTokenOnlySetsAccessTokenCookie() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .type("Bearer")
                .accessToken("access-token-value")
                .refreshToken(null)
                .expireIn(3600L)
                .build();
        when(userClient.login(any(LoginRequest.class))).thenReturn(tokenResponse);

        mockMvc.perform(post("/login")
                        .param("email", "test@test.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(cookie().value("accessToken", "access-token-value"))
                .andExpect(cookie().doesNotExist("refreshToken"));
    }

    @Test
    @DisplayName("X-User-Id 헤더가 있으면 로그아웃 시 백엔드 로그아웃 호출")
    void logoutWithUserIdCallsBackendLogout() throws Exception {
        mockMvc.perform(post("/logout").header("X-User-Id", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andExpect(cookie().maxAge("accessToken", 0))
                .andExpect(cookie().maxAge("refreshToken", 0));

        verify(userClient).logout(1L);
    }

    @Test
    @DisplayName("X-User-Id 헤더가 없어도 로그아웃은 정상 처리")
    void logoutWithoutUserIdSkipsBackendLogout() throws Exception {
        mockMvc.perform(post("/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient, never()).logout(anyLong());
    }

    @Test
    @DisplayName("백엔드 로그아웃 호출이 예외를 던져도 쿠키 삭제 후 정상 리다이렉트")
    void logoutSucceedsEvenWhenBackendLogoutFails() throws Exception {
        doThrow(new RuntimeException("redis down")).when(userClient).logout(1L);

        mockMvc.perform(post("/logout").header("X-User-Id", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }
}