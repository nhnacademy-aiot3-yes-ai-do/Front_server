package site.yesaido.frontserver.controller.user;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.SessionAttribute;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
public class UserViewController {
    private static final String PASSWORD_RESET_VERIFIED_EMAIL = "passwordResetVerifiedEmail";
    private static final String REACT_APP = "forward:/react/index.html";

    // ===== 인증 (Auth) 관련 뷰 =====

    @GetMapping("/login")
    public String loginPage() {
        return REACT_APP;
    }

    @GetMapping("/admin/login")
    public String adminLoginPage() {
        return "auth/admin-login";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return REACT_APP;
    }

    @GetMapping({"/signup/nickname", "/signup-nickname"})
    public String signupNicknamePage() {
        return REACT_APP;
    }

    @GetMapping("/find-password")
    public String findPasswordPage() {
        return REACT_APP;
    }

    @GetMapping("/verify-code")
    public String verifyCodePage() {
        return REACT_APP;
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage(@SessionAttribute(name = PASSWORD_RESET_VERIFIED_EMAIL, required = false) String verifiedEmail) {
        if (verifiedEmail == null || verifiedEmail.isBlank()) {
            return "redirect:/find-password";
        }
        return REACT_APP;
    }

    // ===== 마이페이지 (User) 관련 뷰 =====

    @GetMapping("/mypage")
    @LoginRequired
    public String mypage() {
        return REACT_APP;
    }

    @GetMapping("/mypage/notifications")
    @LoginRequired
    public String notificationSettingsPage() {
        return REACT_APP;
    }
}
