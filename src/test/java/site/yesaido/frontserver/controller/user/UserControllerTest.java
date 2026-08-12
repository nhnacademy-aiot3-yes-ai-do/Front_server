package site.yesaido.frontserver.controller.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private AuthCookieProvider authCookieProvider;

    @Test
    @DisplayName("이메일 중복 확인 - 성공 (true)")
    void checkEmailSuccess() throws Exception {
        given(userClient.checkEmail("test@naver.com")).willReturn(new ApiResponse<>(true, "조회 성공", true));

        mockMvc.perform(get("/users/check-email").param("email", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("이메일 중복 확인 - null 또는 false 분기")
    void checkEmailFailedOrNull() throws Exception {
        given(userClient.checkEmail("fail@naver.com")).willReturn(null);

        mockMvc.perform(get("/users/check-email").param("email", "fail@naver.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("닉네임 중복 확인 - 성공 (true)")
    void checkNicknameSuccess() throws Exception {
        given(userClient.checkNickname("nickTest")).willReturn(new ApiResponse<>(true, "조회 성공", true));

        mockMvc.perform(get("/users/check-nickname").param("nickname", "nickTest"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("닉네임 중복 확인 - null 응답 분기")
    void checkNicknameNull() throws Exception {
        given(userClient.checkNickname("nickTest")).willReturn(null);

        mockMvc.perform(get("/users/check-nickname").param("nickname", "nickTest"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("이메일 인증번호 발송 요청")
    void sendEmailSuccess() throws Exception {
        given(userClient.sendEmail(any())).willReturn(new ApiResponse<>(true, "발송 성공", null));

        mockMvc.perform(post("/users/email/send").param("email", "test@naver.com"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("이메일 인증번호 검증 - 성공 및 실패 분기")
    void verifyEmailSuccessAndFail() throws Exception {
        given(userClient.verifyEmail(any())).willReturn(new ApiResponse<>(true, "검증 성공", true));

        mockMvc.perform(post("/users/email/verify")
                        .param("email", "test@naver.com")
                        .param("code", "123456"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("토큰 시간 연장 (reissue) - 정상 쿠키 분기")
    void reissueSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("newAccess")
                .refreshToken("newRefresh")
                .role("USER")
                .build();
        given(userClient.reissue(any())).willReturn(new ApiResponse<>(true, "재발급 성공", tokenResponse));

        mockMvc.perform(post("/users/reissue").cookie(new jakarta.servlet.http.Cookie("refreshToken", "validRefresh")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("토큰 시간 연장 (reissue) - refreshToken 없을 때 예외 분기")
    void reissueWithoutTokenThrowsException() {
        assertThrows(Exception.class, () -> mockMvc.perform(post("/users/reissue")));
    }

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
    @DisplayName("로그아웃 요청 - userId 있음 + 정상 분기")
    void logoutWithUserId() throws Exception {
        mockMvc.perform(post("/logout").header("X-User-Id", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).logout(1L);
    }

    @Test
    @DisplayName("로그아웃 요청 - userId 없음 / 예외 발생 안전 예외처리 분기")
    void logoutWithoutUserIdAndExceptionHandled() throws Exception {
        doThrow(new RuntimeException("Redis error")).when(userClient).logout(1L);

        mockMvc.perform(post("/logout").header("X-User-Id", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("프로필 마이페이지 조회")
    void getMyPageSuccess() throws Exception {
        UserProfileResponse profileResponse = new UserProfileResponse(1L, "test@naver.com", "이름", "닉네임", "USER", LocalDateTime.now(), LocalDateTime.now());
        given(userClient.getMyPage(null)).willReturn(new ApiResponse<>(true, "조회 성공", profileResponse));

        mockMvc.perform(get("/users/mypage"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("프로필 수정")
    void updateMyPageSuccess() throws Exception {
        ProfileUpdateRequest request = new ProfileUpdateRequest("새닉네임", "oldPass", "newPass");
        given(userClient.updateMyPage(eq(null), any())).willReturn(new ApiResponse<>(true, "수정 성공", null));

        mockMvc.perform(post("/users/mypage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비밀번호 검증")
    void verifyPasswordSuccess() throws Exception {
        PasswordVerifyRequest request = new PasswordVerifyRequest("password123");
        given(userClient.verifyPassword(eq(null), any())).willReturn(new ApiResponse<>(true, "검증 성공", true));

        mockMvc.perform(post("/users/verify-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("휴면 해제")
    void releaseDormantSuccess() throws Exception {
        given(userClient.releaseDormant("dormant@naver.com")).willReturn(new ApiResponse<>(true, "해제 성공", null));

        mockMvc.perform(post("/users/dormant/release").param("email", "dormant@naver.com"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Google OAuth2 로그인")
    void loginWithGoogleSuccess() throws Exception {
        GoogleLoginRequest request = new GoogleLoginRequest("googleIdToken", "google@gmail.com");
        TokenResponse tokenResponse = TokenResponse.builder().accessToken("access").refreshToken("refresh").role("USER").build();
        given(userClient.loginWithGoogle(any())).willReturn(new ApiResponse<>(true, "구글로그인 성공", tokenResponse));

        mockMvc.perform(post("/users/oauth2/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
