package site.yesaido.frontserver.client;

import feign.form.FormData;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.UserSearchResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.MemberSummaryPageResponse;
import site.yesaido.frontserver.dto.user.response.SignupEmailVerificationResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.dto.user.response.UserProfileResponse;

import java.util.List;

@FeignClient(name = "userClient", url = "${feign.client.gateway.url}")
public interface UserClient {
    // 1. 닉네임 중복 확인
    @GetMapping("/api/v1/users/check-nickname")
    ApiResponse<Boolean> checkNickname(@RequestParam("nickname") String nickname);

    // 3. 회원가입
    @PostMapping(value = "/api/v1/users/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<Object> signUp(@RequestPart("request") FormData request, @RequestPart(value = "profileImage", required = false) MultipartFile profileImage);

    // 4. 로그인
    @PostMapping("/api/v1/auth/login")
    ApiResponse<TokenResponse> login(@RequestBody LoginRequest requestDto);

    // 5. 재배 멤버 초대용 사용자 검색
    @GetMapping("/api/v1/users/search")
    List<UserSearchResponse> search(@RequestParam("keyword") String keyword);

    // 6. 로그아웃
    @PostMapping("/api/v1/auth/logout")
    void logout(@RequestBody LogoutRequest request);

    // 7. Token 재발급
    @PostMapping("/api/v1/auth/reissue")
    ApiResponse<TokenResponse> reissue(@RequestBody ReissueRequest reissueRequest);

    // 8. 이메일 인증 코드 발송
    @PostMapping("/api/v1/auth/email/send")
    ApiResponse<Void> sendEmail(@RequestBody EmailSendResponse response);

    // 9. 이메일 인증 코드 검증 요청
    @PostMapping("/api/v1/auth/email/verify")
    ApiResponse<Boolean> verifyEmail(@RequestBody EmailVerifyRequest request);

    @PostMapping("/api/v1/users/signup/verify-email")
    ApiResponse<SignupEmailVerificationResponse> verifySignupEmail(@RequestParam("email") String email, @RequestParam("code") String code);

    // 10. 프로필 조회
    @GetMapping("/api/v1/users/mypage")
    ApiResponse<UserProfileResponse> getMyPage();

    @PutMapping("/api/v1/users/mypage/password")
    ApiResponse<Void> changePassword(@RequestBody PasswordChangeRequest request);

    // 11. 프로필 수정
    @PutMapping("/api/v1/users/mypage")
    ApiResponse<UserProfileResponse> updateMyPage(@RequestBody ProfileUpdateRequest request);
    // 12. 비밀번호 확인
    @PostMapping("/api/v1/users/verify-password")
    ApiResponse<Boolean> verifyPassword(@RequestBody PasswordVerifyRequest request);

    // 13. 휴먼 계정 해제
    @PostMapping("/api/v1/auth/dormant/release")
    ApiResponse<Void> releaseDormant(@RequestParam("email") String email);

    @PostMapping("/api/v1/auth/oauth2/google")
    ApiResponse<TokenResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request);

    // 15. 관리자용 회원 목록 조회
    @GetMapping("/api/v1/admin/members")
    ApiResponse<MemberSummaryPageResponse> getMembers(@RequestParam("status") String status,
                                                      @PageableDefault(size = 8, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable);
    // 16. 회원 탈퇴
    @DeleteMapping("/api/v1/users/withdraw")
    ApiResponse<Void> withdraw(@RequestBody WithdrawRequest request);

    @PostMapping("/api/v1/auth/password/reset")
    ApiResponse<Void> resetPassword(@RequestBody PasswordResetRequest resetRequest);

    @PutMapping(value = "/api/v1/users/mypage/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<String> uploadProfileImage(@RequestPart("file")MultipartFile file);
}
