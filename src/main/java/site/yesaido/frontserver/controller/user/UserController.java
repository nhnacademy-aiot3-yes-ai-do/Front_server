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
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;

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

    @PostMapping("/login")
    public void login(@RequestParam String email,
                      @RequestParam String password,
                      HttpServletResponse response,
                      RedirectAttributes redirectAttributes) throws IOException {

        try{
            ApiResponse<TokenResponse> apiResponse = userClient.login(new LoginRequest(email, password));
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Token response is null");
            }

            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
            response.sendRedirect("ADMIN".equals(tokenResponse.role()) ? "/admin" : "/");
        } catch (Exception e){
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

        authCookieProvider.clearAuthCookies(response);
        response.sendRedirect("/login");
    }

}
