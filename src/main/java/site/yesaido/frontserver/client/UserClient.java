package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import site.yesaido.frontserver.dto.user.LoginRequest;
import site.yesaido.frontserver.dto.user.TokenResponse;
import site.yesaido.frontserver.dto.user.UserSignUpRequest;

@FeignClient(name = "userClient", url = "${feign.client.gateway.url}")
public interface UserClient {
    // 1. 이메일 중복 확인
    @GetMapping("/users/check-email")
    Boolean checkEmail(@RequestParam("email") String email);

    // 2. 닉네임 중복 확인
    @GetMapping("/users/check-nickname")
    Boolean checkNickname(@RequestParam("nickname") String nickname);

    // 3. 회원가입
    @PostMapping("/users/signup")
    Object signUp(@RequestBody UserSignUpRequest requestDto);

    // 4. 로그인
    @PostMapping("/auth/login")
    TokenResponse login(@RequestBody LoginRequest requestDto);


}
