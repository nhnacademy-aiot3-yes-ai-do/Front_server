package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.EmailVerifyRequest;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;

import java.io.IOException;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserClient userClient;

    @GetMapping("/users/check-email")
    public Boolean checkEmail(@RequestParam String email){
        ApiResponse<Boolean> response = userClient.checkEmail(email);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    @GetMapping("/users/check-nickname")
    public Boolean checkNickname(@RequestParam String nickname){
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


    @PostMapping("/signup")
    public void signup(@RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String nickname,
                         HttpServletResponse response) throws IOException {

        UserSignUpRequest request = new UserSignUpRequest(email, password, nickname, "USER");
        userClient.signUp(request);

        response.sendRedirect("/login");
    }

    private static final String ADMIN_ID = "admin@admin";
    private static final String ADMIN_PASSWORD = "admin123!";

    @PostMapping("/login")
    public void login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response, RedirectAttributes redirectAttributes) throws IOException {

        if (ADMIN_ID.equals(email) && ADMIN_PASSWORD.equals(password)) {
            ResponseCookie adminCookie = ResponseCookie.from("isAdmin", "true")
                    .path("/")
                    .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, adminCookie.toString());
            response.sendRedirect("/admin");
            return;
        }

        try{
            LoginRequest request = new LoginRequest(email, password);
            ApiResponse<TokenResponse> apiResponse = userClient.login(request);
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Token response is null");
            }

            ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokenResponse.accessToken())
                    .path("/")
                    .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

            if(tokenResponse.refreshToken() != null) {
                ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", tokenResponse.refreshToken())
                        .path("/")
                        .httpOnly(true)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
            }
            response.sendRedirect("/");
        }catch (Exception e){
            log.warn("로그인 실패 (미가입 또는 비밀번호 불일치): {}", e.getMessage());
            redirectAttributes.addFlashAttribute("loginError", "아이디 또는 비밀번호가 일치하지 않습니다.");
            response.sendRedirect("/");
        }

    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response, @RequestHeader(value = "X-User-Id", required = false) Long userId) throws IOException {
        if(userId != null){
            try {
                userClient.logout(userId);
            }catch (Exception e){
                log.warn("백엔드 레디스 로그아웃 처리 중 예외 발생: ", e);
            }
        }

        ResponseCookie deletedAccessCookie = ResponseCookie.from("accessToken", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        ResponseCookie deletedRefreshCookie = ResponseCookie.from("refreshToken", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        ResponseCookie deletedAdminCookie = ResponseCookie.from("isAdmin", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, deletedAccessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedRefreshCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedAdminCookie.toString());

        response.sendRedirect("/login");
    }

}
