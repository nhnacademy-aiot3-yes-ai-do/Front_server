package site.yesaido.frontserver.controller.user;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
public class UserViewController {
    private static final String PASSWORD_RESET_VERIFIED_EMAIL = "passwordResetVerifiedEmail";
    private static final String PASSWORD_RESET_VERIFIED_AT = "passwordResetVerifiedAt";
    private static final long PASSWORD_RESET_TTL_MS = 10 * 60 * 1000L;
    private static final String REACT_APP = "forward:/react/index.html";

    // ===== 인증 (Auth) 관련 뷰 =====

    @GetMapping({
            "/login",
            "/admin/login",
            "/signup",
            "/signup/nickname",
            "/signup-nickname",
            "/find-password"
    }
    )
    public String authPage(HttpSession session) {
        clearPasswordResetSession(session);
        return REACT_APP;
    }


    @GetMapping("/verify-code")
    public String verifyCodePage() {
        return REACT_APP;
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage(HttpSession session) {
        String verifiedEmail = getVerifiedEmail(session);
        if (verifiedEmail == null || verifiedEmail.isBlank()) {
            return "redirect:/find-password";
        }
        return REACT_APP;
    }

    private void clearPasswordResetSession(HttpSession session) {
        if (session != null) {
            session.removeAttribute(PASSWORD_RESET_VERIFIED_EMAIL);
            session.removeAttribute(PASSWORD_RESET_VERIFIED_AT);
        }
    }

    private String getVerifiedEmail(HttpSession session) {
        if (session == null) return null;
        Object email = session.getAttribute(PASSWORD_RESET_VERIFIED_EMAIL);
        if (email instanceof String verifiedEmail && !verifiedEmail.isBlank()) {
            Object timeObj = session.getAttribute(PASSWORD_RESET_VERIFIED_AT);
            if (timeObj instanceof Long verifiedAt && System.currentTimeMillis() - verifiedAt > PASSWORD_RESET_TTL_MS) {
                clearPasswordResetSession(session);
                return null;
            }
            return verifiedEmail;
        }
        return null;
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
