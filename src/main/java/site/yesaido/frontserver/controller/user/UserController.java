package site.yesaido.frontserver.controller.user;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {
    private final UserClient userClient;
  
    @GetMapping("/mypage")
    public String myPage() {
        return "user/profile";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "auth/signup";
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response) {

        LoginRequest request = new LoginRequest(email, password);

        TokenResponse tokenResponse = userClient.login(request);

        Cookie accessCookie = new Cookie("accessToken", tokenResponse.getAccessToken());
        accessCookie.setPath("/");
        accessCookie.setHttpOnly(true);
        response.addCookie(accessCookie);

        if(tokenResponse.getRefreshToken() != null) {
            Cookie refreshCookie = new Cookie("refreshToken", tokenResponse.getRefreshToken());
            refreshCookie.setPath("/");
            refreshCookie.setHttpOnly(true);
            response.addCookie(refreshCookie);
        }
        return "redirect:/";
    }

    @PostMapping("/logout")
    public String logout(HttpServletResponse response) {
        Cookie accessCookie = new Cookie("accessToken", null);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);
        response.addCookie(accessCookie);

        Cookie refreshCookie = new Cookie("refreshToken", null);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);

        return "redirect:/login";
    }

}
