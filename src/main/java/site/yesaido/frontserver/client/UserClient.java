package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.cultivation.response.UserSearchResponse;
import site.yesaido.frontserver.dto.user.request.EmailVerifyRequest;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.ReissueRequest;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;

import java.util.List;

@FeignClient(name = "userClient", url = "${feign.client.gateway.url}")
@RequestMapping("/api")
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

    // 5. 재배 멤버 초대용 사용자 검색
    @GetMapping("/users/search")
    List<UserSearchResponse> search(@RequestParam("keyword") String keyword);

    // 6. 로그아웃
    @PostMapping("/auth/logout")
    void logout(@RequestHeader("X-User-id") Long userId);

    // 7. Token 재발급
    @PostMapping("/auth/reissue")
    TokenResponse reissue(@RequestBody ReissueRequest reissueRequest);

    // 8. 이메일 인증 코드 발송
    @PostMapping("/auth/email/send")
    String sendEmail(@RequestBody EmailSendResponse response);

    // 9. 이메일 인증 코드 검증 요청
    @PostMapping("/auth/email/verify")
    Boolean verifyEmail(@RequestBody EmailVerifyRequest request);
}
