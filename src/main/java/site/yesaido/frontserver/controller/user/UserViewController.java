package site.yesaido.frontserver.controller.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserViewController {

    // ===== 인증 (Auth) 관련 뷰 =====

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/admin/login")
    public String adminLoginPage() {
        return "auth/admin-login";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "auth/signup";
    }

    @GetMapping({"/signup/nickname", "/signup-nickname"})
    public String signupNicknamePage(@RequestParam(required = false) String email,
                                     @RequestParam(required = false) String password,
                                     Model model) {
        if (email != null) model.addAttribute("email", email);
        if (password != null) model.addAttribute("password", password);
        return "auth/signup-nickname";
    }

    @GetMapping("/find-password")
    public String findPasswordPage() {
        return "auth/find-password";
    }

    @GetMapping("/verify-code")
    public String verifyCodePage(@RequestParam(required = false) String email,
                                 Model model) {
        if (email != null) model.addAttribute("email", email);
        return "auth/verify-code";
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage() {
        return "auth/reset-password";
    }

    // ===== 마이페이지 (User) 관련 뷰 =====

    @GetMapping("/mypage")
    public String mypage() {
        return "user/profile";
    }

    @GetMapping("/mypage/notifications")
    public String notificationSettingsPage() {
        return "user/notification-settings";
    }
}
