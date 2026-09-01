package site.yesaido.frontserver.controller.user;

import feign.FeignException;
import feign.Request;
import feign.Response;
import feign.form.FormData;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.LogoutRequest;
import site.yesaido.frontserver.dto.user.request.PasswordResetRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = {UserController.class, UserViewController.class},
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import({AuthCookieProvider.class, ViewJsonWriter.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private AuthCookieProvider authCookieProvider;

    @MockitoBean
    private NotificationClient notificationClient;

    @MockitoBean
    private CultivationClient cultivationClient;

    @MockitoBean
    private MeterRegistry meterRegistry;

    @Test
    @DisplayName("회원가입 요청 성공")
    void signupSuccess() throws Exception {
        mockMvc.perform(post("/signup")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!")
                        .param("nickname", "nickTest"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).signUp(any(FormData.class), isNull());
    }

    @Test
    @DisplayName("프로필 사진을 포함한 회원가입 요청을 multipart로 전달한다")
    void signupWithProfileImageSuccess() throws Exception {
        MockMultipartFile profileImage = new MockMultipartFile(
                "profileImage", "profile.png", "image/png", "image-content".getBytes()
        );

        mockMvc.perform(multipart("/signup")
                        .file(profileImage)
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!")
                        .param("nickname", "nickTest"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        ArgumentCaptor<FormData> requestCaptor = ArgumentCaptor.forClass(FormData.class);
        verify(userClient).signUp(
                requestCaptor.capture(),
                argThat(file -> file != null && "profile.png".equals(file.getOriginalFilename()))
        );

        FormData requestPart = requestCaptor.getValue();
        String requestJson = new String(requestPart.getData(), StandardCharsets.UTF_8);
        assertTrue("application/json".equals(requestPart.getContentType()));
        assertTrue("request.json".equals(requestPart.getFileName()));
        assertTrue(requestJson.contains("\"email\":\"test@naver.com\""));
        assertTrue(requestJson.contains("\"password\":\"nhn123!\""));
        assertTrue(requestJson.contains("\"nickName\":\"nickTest\""));
    }

    @Test
    @DisplayName("로그인 요청 - 일반 유저 성공 분기")
    void loginUserSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("mockAccess")
                .refreshToken("mockRefresh")
                .role("USER")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/login")
                        .param("email", "test@naver.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));

        verify(authCookieProvider).setAuthCookies(any(), eq("mockAccess"), eq("mockRefresh"), eq("USER"), eq(1_755_671_400_000L));
    }

    @Test
    @DisplayName("로그인 요청 - 관리자 유저 성공 분기")
    void loginAdminSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("mockAccess")
                .refreshToken("mockRefresh")
                .role("ADMIN")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/login")
                        .param("email", "admin@naver.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        verify(authCookieProvider).setAuthCookies(any(), eq("mockAccess"), eq("mockRefresh"), eq("ADMIN"), eq(1_755_671_400_000L));
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
        mockMvc.perform(post("/users/token/logout")
                        .cookie(
                                new Cookie("refreshToken", "valid-refresh-token"),
                                new Cookie("accessToken", "valid-access-token")
                        ))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).logout(new LogoutRequest("valid-refresh-token", "valid-access-token"));
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("Refresh Token 쿠키가 없어도 브라우저 쿠키를 지우고 로그인 화면으로 이동한다")
    void logoutWithoutRefreshTokenStillClearsCookies() throws Exception {
        mockMvc.perform(post("/users/token/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient, never()).logout(any());
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("인증 세션 없이 비밀번호 재설정을 요청하면 비밀번호 찾기 화면으로 이동")
    void resetPasswordWithoutVerifiedSessionRedirectsToFindPassword() throws Exception {
        mockMvc.perform(post("/reset-password")
                        .param("newPassword", "newPassword123!")
                        .param("confirmPassword", "newPassword123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/find-password"));

        verify(userClient, never()).resetPassword(any());
    }

    @Test
    @DisplayName("새 비밀번호가 일치하지 않으면 재설정 화면으로 이동하고 오류를 표시")
    void resetPasswordWithMismatchRedirectsToResetPage() throws Exception {
        mockMvc.perform(post("/reset-password")
                        .sessionAttr("passwordResetVerifiedEmail", "test@naver.com")
                        .param("newPassword", "newPassword123!")
                        .param("confirmPassword", "differentPassword123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/reset-password"))
                .andExpect(flash().attribute("resetPasswordError", "비밀번호가 일치하지 않습니다."));

        verify(userClient, never()).resetPassword(any());
    }

    @Test
    @DisplayName("인증 세션과 일치하는 새 비밀번호가 있으면 재설정 후 로그인으로 이동")
    void resetPasswordSuccess() throws Exception {
        String email = "test@naver.com";
        given(userClient.resetPassword(any())).willReturn(new ApiResponse<>(true, "비밀번호가 변경되었습니다.", null));

        mockMvc.perform(post("/reset-password")
                        .sessionAttr("passwordResetVerifiedEmail", email)
                        .param("newPassword", "newPassword123!")
                        .param("confirmPassword", "newPassword123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andExpect(flash().attributeExists("loginMessage"));

        verify(userClient).resetPassword(new PasswordResetRequest(email, "newPassword123!"));
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("Auth 비밀번호 재설정 호출이 실패하면 재설정 화면으로 이동하고 오류를 표시")
    void resetPasswordFailureRedirectsToResetPage() throws Exception {
        given(userClient.resetPassword(any())).willThrow(new RuntimeException("Auth server error"));

        mockMvc.perform(post("/reset-password")
                        .sessionAttr("passwordResetVerifiedEmail", "test@naver.com")
                        .param("newPassword", "newPassword123!")
                        .param("confirmPassword", "newPassword123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/reset-password"))
                .andExpect(flash().attribute("resetPasswordError", "비밀번호 변경에 실패했습니다. 다시 시도해 주세요."));
    }

    @Test
    @DisplayName("기존 비밀번호와 같은 비밀번호로 재설정하면 Auth의 오류 메시지를 표시")
    void resetPasswordWithSamePasswordShowsAuthErrorMessage() throws Exception {
        given(userClient.resetPassword(any())).willThrow(badRequestException(
                "새 비밀번호는 기존 비밀번호와 달라야 합니다."
        ));

        mockMvc.perform(post("/reset-password")
                        .sessionAttr("passwordResetVerifiedEmail", "test@naver.com")
                        .param("newPassword", "samePassword123!")
                        .param("confirmPassword", "samePassword123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/reset-password"))
                .andExpect(flash().attribute(
                        "resetPasswordError",
                        "새 비밀번호는 기존 비밀번호와 달라야 합니다."
                ));
    }

    @Test
    @DisplayName("관리자 로그인 - 성공 분기")
    void adminLoginSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("adminAccess")
                .refreshToken("adminRefresh")
                .role("ADMIN")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        mockMvc.perform(post("/admin/login")
                        .param("email", "admin@naver.com")
                        .param("password", "adminpass"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        verify(authCookieProvider).setAuthCookies(any(), eq("adminAccess"), eq("adminRefresh"), eq("ADMIN"), eq(1_755_671_400_000L));
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

    private FeignException badRequestException(String message) {
        Request request = Request.create(
                Request.HttpMethod.POST,
                "/api/v1/auth/password/reset",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                null
        );
        Response response = Response.builder()
                .status(400)
                .reason("Bad Request")
                .request(request)
                .headers(Collections.emptyMap())
                .body("{\"message\":\"" + message + "\"}", StandardCharsets.UTF_8)
                .build();
        return FeignException.errorStatus("UserClient#resetPassword(PasswordResetRequest)", response);
    }
}
