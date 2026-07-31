package site.yesaido.frontserver.controller.user;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
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


    @PostMapping("/signup")
    public String signup(@RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String nickname) {

        UserSignUpRequest request = new UserSignUpRequest(email, password, nickname, "USER");
        userClient.signUp(request);

        return "redirect:/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response) {

        LoginRequest request = new LoginRequest(email, password);

        TokenResponse tokenResponse = userClient.login(request);

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokenResponse.getAccessToken())
                .path("/")
                        .httpOnly(true)
                                .sameSite("Lax")
                                        .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        if(tokenResponse.getRefreshToken() != null) {
            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", tokenResponse.getRefreshToken())
                .path("/")
                .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        }
        return "redirect:/";
    }

    @PostMapping("/logout")
    public String logout(HttpServletResponse response, @RequestHeader(value = "X-User-Id", required = false) Long userId) {
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

        response.addHeader(HttpHeaders.SET_COOKIE, deletedAccessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedRefreshCookie.toString());

        return "redirect:/login";
    }

}
