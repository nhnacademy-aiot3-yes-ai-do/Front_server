// src/main/java/site/yesaido/frontserver/controller/AuthController.java
package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

// TODO: 백엔드(게이트웨이) 연동 준비가 되면 Feign 클라이언트(AuthClient, AuthEmailClient, UserClient)와
//       요청/응답 DTO를 다시 만들고, 아래 메서드들에 실제 API 호출을 채워 넣어야 합니다.
//       지금은 화면 전환만 확인하는 용도로 단순화된 컨트롤러입니다.
@Controller
public class AuthController {

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "auth/signup";
    }

    @GetMapping("/signup-nickname")
    public String signupNicknamePage(@RequestParam String email,
                                     @RequestParam String password,
                                     Model model) {
        model.addAttribute("email", email);
        model.addAttribute("password", password);
        return "auth/signup-nickname";
    }

    @GetMapping("/find-password")
    public String findPasswordPage() {
        return "auth/find-password";
    }

    @GetMapping("/verify-code")
    public String verifyCodePage(@RequestParam String email, Model model) {
        model.addAttribute("email", email);
        return "auth/verify-code";
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage(@RequestParam String email,
                                    @RequestParam String code,
                                    Model model) {
        model.addAttribute("email", email);
        return "auth/reset-password";
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response) {
        // TODO: 백엔드 연동 시 실제 인증 API 호출 결과(성공/실패, 진짜 토큰)로 교체해야 합니다.
        //       지금은 화면 흐름만 확인하는 용도로 무조건 로그인 성공 처리하고 더미 토큰을 내려줍니다.
        response.addCookie(buildCookie("accessToken", "demo-access-token", 60 * 60 * 24));
        return "redirect:/";
    }

    @PostMapping("/signup")
    public String signup() {
        return "redirect:/login";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String email,
                                @RequestParam String newPassword,
                                @RequestParam String confirmPassword,
                                Model model) {
        model.addAttribute("email", email);

        if (!newPassword.equals(confirmPassword)) {
            model.addAttribute("resetPasswordError", "비밀번호가 일치하지 않습니다.");
            return "auth/reset-password";
        }

        return "redirect:/login";
    }

    @PostMapping("/logout")
    public String logout(@CookieValue(value = "accessToken", required = false) String accessToken,
                         HttpServletResponse response) {
        clearAuthCookies(response);
        return "redirect:/login";
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addCookie(buildCookie("accessToken", null, 0));
        response.addCookie(buildCookie("refreshToken", null, 0));
    }

    private Cookie buildCookie(String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        // TODO: 배포(HTTPS) 환경에서는 다시 true로 바꿔야 합니다.
        //       로컬 http://localhost 개발 중에는 Secure 쿠키가 저장되지 않아 꺼둡니다.
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        return cookie;
    }
}