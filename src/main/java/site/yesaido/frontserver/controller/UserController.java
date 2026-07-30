package site.yesaido.frontserver.controller;

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

@Controller
@RequiredArgsConstructor
public class UserController {
    private final UserClient userClient; // 👈 FeignClient 주입!

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
        response.addCookie(accessCookie);

        return "redirect:/cultivations";
    }

    @PostMapping("/signup")
    public String signup(@RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String nickname) {

        UserSignUpRequest request = new UserSignUpRequest(email, password, nickname, "USER");
        userClient.signUp(request); // 👈 OpenFeign 로 백엔드 호출!

        return "redirect:/login"; // 가입 성공 시 로그인 페이지로 이동
    }

    @GetMapping("/users/check-email")
    @ResponseBody
    public Boolean checkEmail(@RequestParam String email){
        return userClient.checkEmail(email);
    }

    @GetMapping("/users/check-nickname")
    @ResponseBody
    public Boolean checkNickname(@RequestParam String nickname){
        return userClient.checkNickname(nickname);
    }

    @GetMapping("/signup-nickname")
    public String signupNicknamePage(@RequestParam String email,
                                     @RequestParam String password,
                                     Model model) {
        model.addAttribute("email", email);
        model.addAttribute("password", password);
        return "auth/signup-nickname";
    }

}
