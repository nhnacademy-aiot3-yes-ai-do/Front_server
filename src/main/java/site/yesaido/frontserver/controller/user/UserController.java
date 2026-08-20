package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {
    private static final String LOGIN_URL = "/login";
    private static final String REDIRECT_PREFIX = "redirect:";

    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;

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
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
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
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
            response.sendRedirect("/admin");
        } catch (Exception e) {
            log.warn("관리자 로그인 실패: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("loginError", "관리자 계정 정보가 일치하지 않습니다.");
            response.sendRedirect("/admin/login");
        }
    }

    @PostMapping("/logout")
    public String logout(HttpServletResponse response) {
        try {
            userClient.logout();
        } catch (Exception e) {
            log.warn("백엔드 레디스 토큰 삭제 중 예외 발생 : {}", e.getMessage());
        }

        authCookieProvider.clearAuthCookies(response);
        return REDIRECT_PREFIX + LOGIN_URL;
    }
}