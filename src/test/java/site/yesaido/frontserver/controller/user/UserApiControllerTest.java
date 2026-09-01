package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;
import site.yesaido.frontserver.dto.user.response.SignupEmailVerificationResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

@WebMvcTest(
        value = UserApiController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class UserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private AuthCookieProvider authCookieProvider;

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
    @DisplayName("회원가입 이메일 인증 결과를 그대로 반환한다")
    void verifySignupEmailSuccess() throws Exception {
        SignupEmailVerificationResponse result = new SignupEmailVerificationResponse(true, "AVAILABLE", null);
        given(userClient.verifySignupEmail("test@naver.com", "123456"))
                .willReturn(new ApiResponse<>(true, "회원가입 이메일 인증 결과입니다.", result));

        mockMvc.perform(post("/users/signup/verify-email")
                        .param("email", "test@naver.com")
                        .param("code", "123456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.eligibility").value("AVAILABLE"));
    }

    @Test
    @DisplayName("이메일 인증번호 검증 - response가 null인 분기")
    void verifyEmailReturnsFalseWhenResponseIsNull() throws Exception {
        given(userClient.verifyEmail(any())).willReturn(null);

        mockMvc.perform(post("/users/email/verify")
                        .param("email", "test@naver.com")
                        .param("code", "000000"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("이메일 인증번호 검증 - response는 있지만 data가 false인 분기")
    void verifyEmailReturnsFalseWhenDataIsFalse() throws Exception {
        given(userClient.verifyEmail(any())).willReturn(new ApiResponse<>(true, "검증 실패", false));

        mockMvc.perform(post("/users/email/verify")
                        .param("email", "test@naver.com")
                        .param("code", "000000"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("비밀번호 재설정용 이메일 인증 성공 시 인증 이메일을 세션에 저장한다")
    void verifyPasswordResetEmailStoresVerifiedEmailInSession() throws Exception {
        String email = "test@naver.com";
        PasswordResetEmailVerifyRequest requestBody = new PasswordResetEmailVerifyRequest(email, "123456");
        given(userClient.verifyEmail(any())).willReturn(new ApiResponse<>(true, "검증 성공", true));

        mockMvc.perform(post("/users/password-reset/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"))
                .andExpect(request().sessionAttribute("passwordResetVerifiedEmail", email));
    }

    @Test
    @DisplayName("비밀번호 재설정용 이메일 인증 실패 시 인증 이메일을 세션에 저장하지 않는다")
    void verifyPasswordResetEmailDoesNotStoreEmailWhenVerificationFails() throws Exception {
        PasswordResetEmailVerifyRequest requestBody = new PasswordResetEmailVerifyRequest("test@naver.com", "000000");
        given(userClient.verifyEmail(any())).willReturn(new ApiResponse<>(true, "검증 실패", false));

        mockMvc.perform(post("/users/password-reset/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(content().string("false"))
                .andExpect(request().sessionAttributeDoesNotExist("passwordResetVerifiedEmail"));
    }

    @Test
    @DisplayName("토큰 시간 연장 (reissue) - 정상 쿠키 분기")
    void reissueSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("newAccess")
                .refreshToken("newRefresh")
                .role("USER")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.reissue(any())).willReturn(new ApiResponse<>(true, "재발급 성공", tokenResponse));

        mockMvc.perform(post("/users/token/reissue").cookie(new Cookie("refreshToken", "validRefresh")))
                .andExpect(status().isOk());

        verify(authCookieProvider).setAuthCookies(any(), eq("newAccess"), eq("newRefresh"), eq("USER"), eq(1_755_671_400_000L));
    }

    @Test
    @DisplayName("토큰 시간 연장 (reissue) - refreshToken 없을 때 401 반환")
    void reissueWithoutTokenReturns401() throws Exception {
        mockMvc.perform(post("/users/token/reissue"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("로그인이 필요합니다."));
    }

    @Test
    @DisplayName("프로필 마이페이지 조회")
    void getMyPageSuccess() throws Exception {
        UserProfileResponse profileResponse = new UserProfileResponse(1L, "test@naver.com", "닉네임", "USER", "ACTIVE", LocalDateTime.now(), LocalDateTime.now(), null, true);
        given(userClient.getMyPage()).willReturn(new ApiResponse<>(true, "조회 성공", profileResponse));

        mockMvc.perform(get("/users/mypage"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("프로필 수정")
    void updateMyPageSuccess() throws Exception {
        ProfileUpdateRequest request = new ProfileUpdateRequest("새닉네임");
        given(userClient.updateMyPage(any())).willReturn(new ApiResponse<>(true, "수정 성공", null));

        mockMvc.perform(put("/users/mypage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("프로필 사진 업로드 요청을 User 서버에 multipart 형식으로 전달한다")
    void uploadProfileImageSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "profile.png",
                MediaType.IMAGE_PNG_VALUE,
                "image-content".getBytes()
        );
        given(userClient.uploadProfileImage(any()))
                .willReturn(new ApiResponse<>(true, "프로필 이미지 업로드 성공", "profiles/1/image.png"));

        mockMvc.perform(multipart(HttpMethod.PUT, "/users/mypage/profile-image")
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("profiles/1/image.png"));

        verify(userClient).uploadProfileImage(any());
    }

    @Test
    @DisplayName("비밀번호 변경 성공 시 User 서버에 요청을 전달하고 인증 쿠키를 삭제한다")
    void changePasswordSuccess() throws Exception {
        PasswordChangeRequest request = new PasswordChangeRequest("currentPass1!", "newPass1!");
        given(userClient.changePassword(any())).willReturn(new ApiResponse<>(true, "비밀번호가 변경되었습니다.", null));

        mockMvc.perform(put("/users/mypage/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(userClient).changePassword(request);
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("비밀번호 검증")
    void verifyPasswordSuccess() throws Exception {
        PasswordVerifyRequest request = new PasswordVerifyRequest("password123");
        given(userClient.verifyPassword(any())).willReturn(new ApiResponse<>(true, "검증 성공", true));

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
        GoogleLoginRequest request = new GoogleLoginRequest("googleIdToken", "google@gmail.com", "구글유저");
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("access")
                .refreshToken("refresh")
                .role("USER")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.loginWithGoogle(any())).willReturn(new ApiResponse<>(true, "구글로그인 성공", tokenResponse));

        mockMvc.perform(post("/users/oauth2/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(authCookieProvider).setAuthCookies(any(), eq("access"), eq("refresh"), eq("USER"), eq(1_755_671_400_000L));
    }

    @Test
    @DisplayName("회원 탈퇴 성공 시 Auth에 요청을 전달하고 인증 쿠키를 삭제한다")
    void withdrawSuccessClearsAuthCookies() throws Exception {
        WithdrawRequest request = new WithdrawRequest("password123!");
        given(userClient.withdraw(any())).willReturn(new ApiResponse<>(true, "회원 탈퇴가 완료되었습니다.", null));

        mockMvc.perform(delete("/users/withdraw")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원 탈퇴가 완료되었습니다."));

        verify(userClient).withdraw(request);
        verify(authCookieProvider).clearAuthCookies(any());
    }

    @Test
    @DisplayName("회원 탈퇴 응답이 실패면 인증 쿠키를 삭제하지 않는다")
    void withdrawFailureDoesNotClearAuthCookies() throws Exception {
        WithdrawRequest request = new WithdrawRequest("password123!");
        given(userClient.withdraw(any())).willReturn(new ApiResponse<>(false, "비밀번호가 일치하지 않습니다.", null));

        mockMvc.perform(delete("/users/withdraw")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false));

        verify(authCookieProvider, never()).clearAuthCookies(any());
    }
}
