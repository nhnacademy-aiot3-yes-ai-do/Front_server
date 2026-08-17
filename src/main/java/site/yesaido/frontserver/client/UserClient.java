package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.UserSearchResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;

import java.util.List;

@FeignClient(name = "userClient", url = "${feign.client.gateway.url}")
public interface UserClient {
    // 1. 이메일 중복 확인
    @GetMapping("/api/users/check-email")
    ApiResponse<Boolean> checkEmail(@RequestParam("email") String email);

    // 2. 닉네임 중복 확인
    @GetMapping("/api/users/check-nickname")
    ApiResponse<Boolean> checkNickname(@RequestParam("nickname") String nickname);

    // 3. 회원가입
    @PostMapping("/api/users/signup")
    ApiResponse<Object> signUp(@RequestBody UserSignUpRequest requestDto);

    // 4. 로그인
    @PostMapping("/api/auth/login")
    ApiResponse<TokenResponse> login(@RequestBody LoginRequest requestDto);

    // 5. 재배 멤버 초대용 사용자 검색
    @GetMapping("/api/users/search")
    List<UserSearchResponse> search(@RequestParam("keyword") String keyword);

    // 6. 로그아웃
    @PostMapping("/api/auth/logout")
    void logout(@RequestHeader("X-User-Id") Long userId);

    // 7. Token 재발급
    @PostMapping("/api/auth/reissue")
    ApiResponse<TokenResponse> reissue(@RequestBody ReissueRequest reissueRequest);

    // 8. 이메일 인증 코드 발송
    @PostMapping("/api/auth/email/send")
    ApiResponse<Void> sendEmail(@RequestBody EmailSendResponse response);

    // 9. 이메일 인증 코드 검증 요청
    @PostMapping("/api/auth/email/verify")
    ApiResponse<Boolean> verifyEmail(@RequestBody EmailVerifyRequest request);

    // 10. 프로필 조회
    @GetMapping("/api/users/mypage")
    ApiResponse<UserProfileResponse> getMyPage(@RequestHeader(value = "X-User-Id", required = false) Long userId);

    // 11. 프로필 수정
    @PostMapping("/api/users/mypage")
    ApiResponse<UserProfileResponse> updateMyPage(@RequestHeader(value = "X-User-Id", required = false) Long userId, @RequestBody ProfileUpdateRequest request);

    // 12. 비밀번호 확인
    @PostMapping("/api/users/verify-password")
    ApiResponse<Boolean> verifyPassword(@RequestHeader(value = "X-User-Id", required = false) Long userId, @RequestBody PasswordVerifyRequest request);

    // 13. 휴먼 계정 해제
    @PostMapping("/api/auth/dormant/release")
    ApiResponse<Void> releaseDormant(@RequestParam("email") String email);

    @PostMapping("/api/auth/oauth2/google")
    ApiResponse<TokenResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request);
}
