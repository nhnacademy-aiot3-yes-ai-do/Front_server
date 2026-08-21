package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;
import site.yesaido.frontserver.exception.MissingRefreshTokenException;
import site.yesaido.frontserver.util.AuthCookieProvider;

@RestController
@RequiredArgsConstructor
public class UserApiController {
    private static final String REFRESH_TOKEN = "refreshToken";

    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;

    @GetMapping("/users/check-email")
    public Boolean checkEmail(@RequestParam String email) {
        ApiResponse<Boolean> response = userClient.checkEmail(email);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    @GetMapping("/users/check-nickname")
    public Boolean checkNickname(@RequestParam String nickname) {
        ApiResponse<Boolean> response = userClient.checkNickname(nickname);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    // 이메일 인증번호 발송
    @PostMapping("/users/email/send")
    public ApiResponse<Void> sendEmail(@RequestParam String email) {
        return userClient.sendEmail(new EmailSendResponse(email));
    }

    // 이메일 인증번호 확인
    @PostMapping("/users/email/verify")
    public Boolean verifyEmail(@RequestParam String email, @RequestParam String code) {
        ApiResponse<Boolean> response = userClient.verifyEmail(new EmailVerifyRequest(email.trim(), code.trim()));
        return response != null && Boolean.TRUE.equals(response.data());
    }

    // 토큰 시간 연장
    @PostMapping("/users/reissue")
    public ApiResponse<TokenResponse> reissue(@CookieValue(name = REFRESH_TOKEN, required = false) String refreshToken,
                                              HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new MissingRefreshTokenException("refreshToken이 없습니다. 다시 로그인해주세요.");
        }

        ApiResponse<TokenResponse> apiResponse = userClient.reissue(new ReissueRequest(refreshToken));
        TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;

        if (tokenResponse != null) {
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
        }

        return apiResponse;
    }

    // 프로필 정보 조회
    @GetMapping("/users/mypage")
    public ApiResponse<UserProfileResponse> getMyPage() {
        return userClient.getMyPage();
    }

    @PostMapping("/users/mypage")
    public ApiResponse<UserProfileResponse> updateMyPage(@RequestBody ProfileUpdateRequest request) {
        return userClient.updateMyPage(request);
    }

    // 프로필 수정 전 비밀번호 검증
    @PostMapping("/users/verify-password")
    public ApiResponse<Boolean> verifyPassword(@RequestBody PasswordVerifyRequest request) {
        return userClient.verifyPassword(request);
    }

    // 휴면 해제
    @PostMapping("/users/dormant/release")
    public ApiResponse<Void> releaseDormant(@RequestParam String email) {
        return userClient.releaseDormant(email);
    }

    // Google OAuth
    @PostMapping("/users/oauth2/google")
    public ApiResponse<TokenResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request, HttpServletResponse response) {
        ApiResponse<TokenResponse> apiResponse = userClient.loginWithGoogle(request);
        TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;

        if (tokenResponse != null) {
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
        }

        return apiResponse;
    }
}