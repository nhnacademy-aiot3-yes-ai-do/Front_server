package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {
    private static final String LOGIN_URL = "/login";
    private static final String REDIRECT_PREFIX = "redirect:";
    private static final String REFRESH_TOKEN = "refreshToken";

    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;

    @ResponseBody
    @GetMapping("/users/check-email")
    public Boolean checkEmail(@RequestParam String email) {
        ApiResponse<Boolean> response = userClient.checkEmail(email);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    @ResponseBody
    @GetMapping("/users/check-nickname")
    public Boolean checkNickname(@RequestParam String nickname) {
        ApiResponse<Boolean> response = userClient.checkNickname(nickname);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    // 이메일 인증번호 발송
    @ResponseBody
    @PostMapping("/users/email/send")
    public ApiResponse<Void> sendEmail(@RequestParam String email) {
        return userClient.sendEmail(new EmailSendResponse(email));
    }

    // 이메일 인증번호 확인
    @ResponseBody
    @PostMapping("/users/email/verify")
    public Boolean verifyEmail(@RequestParam String email, @RequestParam String code) {
        ApiResponse<Boolean> response = userClient.verifyEmail(new EmailVerifyRequest(email.trim(), code.trim()));
        return response != null && Boolean.TRUE.equals(response.data());
    }

    // 토큰 시간 연장
    @ResponseBody
    @PostMapping("/users/reissue")
    public ApiResponse<TokenResponse> reissue(@CookieValue(name = REFRESH_TOKEN, required = false) String refreshToken,
                                              HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("refreshToken is null");
        }

        ApiResponse<TokenResponse> apiResponse = userClient.reissue(new ReissueRequest(refreshToken));
        TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;

        if (tokenResponse != null) {
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
        }

        return apiResponse;
    }

    @PostMapping("/signup")
    public String signup(@RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String nickname) {
        UserSignUpRequest request = new UserSignUpRequest(email, password, nickname, "USER");
        userClient.signUp(request);
        return REDIRECT_PREFIX + LOGIN_URL;
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response,
                        RedirectAttributes redirectAttributes) throws IOException {
        try {
            ApiResponse<TokenResponse> apiResponse = userClient.login(new LoginRequest(email, password));
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Token response is null");
            }
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
            redirectAttributes.addFlashAttribute("justLoggedIn", true);
            return "ADMIN".equals(tokenResponse.role()) ? REDIRECT_PREFIX + "/admin" : REDIRECT_PREFIX + "/";
        } catch (DormantUserException e) {
            throw e;
        } catch (Exception e) {
            log.warn("로그인 실패: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("loginError", "아이디 또는 비밀번호가 일치하지 않습니다.");

            return REDIRECT_PREFIX + LOGIN_URL;
        }
    }

    // 관리자 전용 로그인: 일반 로그인과 같은 인증을 쓰되, 응답의 role이 ADMIN이 아니면
    // 로그인 자체를 실패 처리함 (일반 회원 계정으로는 이 창을 통해 로그인할 수 없음)
    @PostMapping("/admin/login")
    public void adminLogin(@RequestParam String email,
                           @RequestParam String password,
                           HttpServletResponse response,
                           RedirectAttributes redirectAttributes) throws IOException {
        try {
            ApiResponse<TokenResponse> apiResponse = userClient.login(new LoginRequest(email, password));
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Token response is null");
            }
            if (!"ADMIN".equals(tokenResponse.role())) {
                throw new IllegalStateException("관리자 계정이 아닙니다");
            }
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
            response.sendRedirect("/admin");
        } catch (Exception e) {
            log.warn("관리자 로그인 실패: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("loginError", "관리자 계정 정보가 일치하지 않습니다.");
            response.sendRedirect("/admin/login");
        }
    }


    @PostMapping("/logout")
    public String logout(HttpServletResponse response,
                         @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId != null) {
            try {
                userClient.logout(userId);
            } catch (Exception e) {
                log.warn("백엔드 레디스 로그아웃 처리 중 예외 발생: ", e);
            }
        }
        authCookieProvider.clearAuthCookies(response);
        return REDIRECT_PREFIX + LOGIN_URL;
    }

    // 프로필 정보 조회
    @ResponseBody
    @GetMapping("/users/mypage")
    public ApiResponse<UserProfileResponse> getMyPage() {
        return userClient.getMyPage(null);
    }

    @ResponseBody
    @PostMapping("/users/mypage")
    public ApiResponse<UserProfileResponse> updateMyPage(@RequestBody ProfileUpdateRequest request) {
        return userClient.updateMyPage(null, request);
    }

    // 프로필 수정 전 비밀번호 검증
    @ResponseBody
    @PostMapping("/users/verify-password")
    public ApiResponse<Boolean> verifyPassword(@RequestBody PasswordVerifyRequest request) {
        return userClient.verifyPassword(null, request);
    }

    // 휴면 해제
    @ResponseBody
    @PostMapping("/users/dormant/release")
    public ApiResponse<Void> releaseDormant(@RequestParam String email) {
        return userClient.releaseDormant(email);
    }

    // Google OAuth
    @ResponseBody
    @PostMapping("/users/oauth2/google")
    public ApiResponse<TokenResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request, HttpServletResponse response) {
        ApiResponse<TokenResponse> apiResponse = userClient.loginWithGoogle(request);
        TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;

        if (tokenResponse != null) {
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
        }

        return apiResponse;
    }
}
