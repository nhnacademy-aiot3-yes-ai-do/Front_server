package site.yesaido.frontserver.controller.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.EmailVerifyRequest;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.ReissueRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.EmailSendResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserClient userClient;

    private static final String ACCESS_TOKEN_COOKIE = "accessToken";
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final String EXPIRES_AT_COOKIE = "accessTokenExpiresAt";
    private static final String MESSAGE_KEY = "message";

    // JWT payload(exp 클레임)만 읽는 용도라 Spring이 관리하는 ObjectMapper 빈에 의존하지 않고
    // 직접 생성해서 씀 (스프링 부트 버전에 따라 자동 등록되는 ObjectMapper 빈이 없을 수 있어서 안전하게 분리).
    private static final ObjectMapper JWT_PAYLOAD_MAPPER = new ObjectMapper();

    // 로그인 세션 유지시간(30분)을 헤더에서 보여주기 위해 accessToken(JWT)의 exp 클레임만 읽음.
    // 서명 검증은 하지 않음 — 실제 인증/검증은 Gateway·User_server가 담당하고, 여긴 만료 시각
    // 표시용 메타데이터만 필요하기 때문. 파싱 실패 시엔 설정된 만료시간(30분)만큼 남았다고 가정.
    private static final long DEFAULT_ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000L;

    private long extractExpiryMillis(String accessToken) {
        try {
            String[] parts = accessToken.split("\\.");
            if (parts.length < 2) {
                return System.currentTimeMillis() + DEFAULT_ACCESS_TOKEN_TTL_MS;
            }
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            JsonNode payload = JWT_PAYLOAD_MAPPER.readTree(payloadJson);
            if (!payload.has("exp")) {
                return System.currentTimeMillis() + DEFAULT_ACCESS_TOKEN_TTL_MS;
            }
            return payload.get("exp").asLong() * 1000L;
        } catch (Exception e) {
            log.warn("accessToken exp 파싱 실패, 기본 만료시간(30분)으로 대체: {}", e.getMessage());
            return System.currentTimeMillis() + DEFAULT_ACCESS_TOKEN_TTL_MS;
        }
    }

    private void setAccessTokenExpiresAtCookie(HttpServletResponse response, String accessToken) {
        long expiresAtMillis = extractExpiryMillis(accessToken);
        // httpOnly가 아님: 헤더의 남은시간 타이머 JS가 읽어야 하는 값이라 일부러 열어둠
        // (토큰 자체는 그대로 accessToken httpOnly 쿠키에만 있음)
        ResponseCookie expiresAtCookie = ResponseCookie.from(EXPIRES_AT_COOKIE, String.valueOf(expiresAtMillis))
                .path("/")
                .httpOnly(false)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, expiresAtCookie.toString());
    }

    @GetMapping("/users/check-email")
    public Boolean checkEmail(@RequestParam String email){
        ApiResponse<Boolean> response = userClient.checkEmail(email);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    @GetMapping("/users/check-nickname")
    public Boolean checkNickname(@RequestParam String nickname){
        ApiResponse<Boolean> response = userClient.checkNickname(nickname);
        return response != null && Boolean.TRUE.equals(response.data());
    }

    // 이메일 인증번호 발송
    @PostMapping("/users/email/send")
    public ApiResponse<Void> sendEmail(@RequestParam String email) {
        return userClient.sendEmail(new EmailSendResponse(email));
    }

    // 이메일 인증번호 확인
    @PostMapping("/users/email/verify")
    public Boolean verifyEmail(@RequestParam String email, @RequestParam String code) {
        ApiResponse<Boolean> response = userClient.verifyEmail(new EmailVerifyRequest(email.trim(), code.trim()));
        return response != null && Boolean.TRUE.equals(response.data());
    }


    @PostMapping("/signup")
    public void signup(@RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String nickname,
                         HttpServletResponse response) throws IOException {

        UserSignUpRequest request = new UserSignUpRequest(email, password, nickname, "USER");
        userClient.signUp(request);

        response.sendRedirect("/login");
    }

    private static final String ADMIN_ID = "admin@admin";
    private static final String ADMIN_PASSWORD = "admin123!";

    @PostMapping("/login")
    public void login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response, RedirectAttributes redirectAttributes) throws IOException {

        if (ADMIN_ID.equals(email) && ADMIN_PASSWORD.equals(password)) {
            ResponseCookie adminCookie = ResponseCookie.from("isAdmin", "true")
                    .path("/")
                    .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, adminCookie.toString());
            response.sendRedirect("/admin");
            return;
        }

        try{
            LoginRequest request = new LoginRequest(email, password);
            ApiResponse<TokenResponse> apiResponse = userClient.login(request);
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Token response is null");
            }

            ResponseCookie accessCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, tokenResponse.accessToken())
                    .path("/")
                    .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

            if(tokenResponse.refreshToken() != null) {
                ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, tokenResponse.refreshToken())
                        .path("/")
                        .httpOnly(true)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
            }

            setAccessTokenExpiresAtCookie(response, tokenResponse.accessToken());
            response.sendRedirect("/");
        }catch (Exception e){
            log.warn("로그인 실패 (미가입 또는 비밀번호 불일치): {}", e.getMessage());
            redirectAttributes.addFlashAttribute("loginError", "아이디 또는 비밀번호가 일치하지 않습니다.");
            response.sendRedirect("/");
        }

    }

    // 로그인 연장하기: httpOnly라 JS가 못 읽는 refreshToken 쿠키를 서버에서 대신 읽어서
    // User_server에 재발급을 요청하고, 새 토큰들로 쿠키를 다시 세팅함
    @PostMapping("/users/reissue")
    public ResponseEntity<Map<String, Object>> reissue(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken,
            HttpServletResponse response) {

        if (refreshToken == null) {
            return ResponseEntity.status(401).body(Map.of(MESSAGE_KEY, "로그인이 만료되었어요. 다시 로그인해주세요."));
        }

        try {
            ApiResponse<TokenResponse> apiResponse = userClient.reissue(new ReissueRequest(refreshToken));
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Reissue token response is null");
            }

            ResponseCookie accessCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, tokenResponse.accessToken())
                    .path("/")
                    .httpOnly(true)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

            if (tokenResponse.refreshToken() != null) {
                ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, tokenResponse.refreshToken())
                        .path("/")
                        .httpOnly(true)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
            }

            setAccessTokenExpiresAtCookie(response, tokenResponse.accessToken());

            return ResponseEntity.ok(Map.of(MESSAGE_KEY, "로그인이 30분 연장되었어요."));
        } catch (Exception e) {
            log.warn("로그인 연장(토큰 재발급) 실패: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of(MESSAGE_KEY, "로그인 연장에 실패했어요. 다시 로그인해주세요."));
        }
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response, @RequestHeader(value = "X-User-Id", required = false) Long userId) throws IOException {
        if(userId != null){
            try {
                userClient.logout(userId);
            }catch (Exception e){
                log.warn("백엔드 레디스 로그아웃 처리 중 예외 발생: ", e);
            }
        }

        ResponseCookie deletedAccessCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        ResponseCookie deletedRefreshCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        ResponseCookie deletedAdminCookie = ResponseCookie.from("isAdmin", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .sameSite("Lax")
                .build();

        ResponseCookie deletedExpiresAtCookie = ResponseCookie.from(EXPIRES_AT_COOKIE, "")
                .path("/")
                .maxAge(0)
                .httpOnly(false)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, deletedAccessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedRefreshCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedAdminCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deletedExpiresAtCookie.toString());

        response.sendRedirect("/login");
    }

}
