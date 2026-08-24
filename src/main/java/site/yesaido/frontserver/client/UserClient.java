package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
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
    @GetMapping("/api/v1/users/check-email")
    ApiResponse<Boolean> checkEmail(@RequestParam("email") String email);

    // 2. 닉네임 중복 확인
    @GetMapping("/api/v1/users/check-nickname")
    ApiResponse<Boolean> checkNickname(@RequestParam("nickname") String nickname);

    // 3. 회원가입
    @PostMapping("/api/v1/users/signup")
    ApiResponse<Object> signUp(@RequestBody UserSignUpRequest requestDto);

    // 4. 로그인
    @PostMapping("/api/v1/auth/login")
    ApiResponse<TokenResponse> login(@RequestBody LoginRequest requestDto);

    // 5. 재배 멤버 초대용 사용자 검색
    @GetMapping("/api/v1/users/search")
    List<UserSearchResponse> search(@RequestParam("keyword") String keyword);

    // 6. 로그아웃
    @PostMapping("/api/v1/auth/logout")
    void logout();

    // 7. Token 재발급
    @PostMapping("/api/v1/auth/reissue")
    ApiResponse<TokenResponse> reissue(@RequestBody ReissueRequest reissueRequest);

    // 8. 이메일 인증 코드 발송
    @PostMapping("/api/v1/auth/email/send")
    ApiResponse<Void> sendEmail(@RequestBody EmailSendResponse response);

    // 9. 이메일 인증 코드 검증 요청
    @PostMapping("/api/v1/auth/email/verify")
    ApiResponse<Boolean> verifyEmail(@RequestBody EmailVerifyRequest request);

    // 10. 프로필 조회
    @GetMapping("/api/v1/users/mypage")
    ApiResponse<UserProfileResponse> getMyPage();

    // 11. 프로필 수정
    @PostMapping("/api/v1/users/mypage")
    ApiResponse<UserProfileResponse> updateMyPage(@RequestBody ProfileUpdateRequest request);

    // 12. 비밀번호 확인
    @PostMapping("/api/v1/users/verify-password")
    ApiResponse<Boolean> verifyPassword(@RequestBody PasswordVerifyRequest request);

    // 13. 휴먼 계정 해제
    @PostMapping("/api/v1/auth/dormant/release")
    ApiResponse<Void> releaseDormant(@RequestParam("email") String email);

    @PostMapping("/api/v1/auth/oauth2/google")
    ApiResponse<TokenResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request);
}
