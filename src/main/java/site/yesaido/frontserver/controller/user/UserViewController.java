package site.yesaido.frontserver.controller.user;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class UserViewController {

    @GetMapping("/mypage")
    public String myPage() {
        return "user/profile";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "auth/signup";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/signup-nickname")
    public String signupNicknamePage(@RequestParam String email,
                                     @RequestParam String password,
                                     Model model) {
        model.addAttribute("email", email);
        model.addAttribute("password", password);
        return "auth/signup-nickname";
    }
//
//    @GetMapping("/find-password")
//    public String findPasswordPage() {
//        return "auth/find-password";
//    }

    @GetMapping("/verify-code")
    public String verifyCodePage(@RequestParam String email, Model model) {
        model.addAttribute("email", email);
        return "auth/verify-code";
    }

//    @GetMapping("/reset-password")
//    public String resetPasswordPage(@RequestParam String email,
//                                    @RequestParam String code,
//                                    Model model) {
//        model.addAttribute("email", email);
//        return "auth/reset-password";
//    }


}