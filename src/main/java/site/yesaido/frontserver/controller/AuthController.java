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
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        return cookie;
    }
}