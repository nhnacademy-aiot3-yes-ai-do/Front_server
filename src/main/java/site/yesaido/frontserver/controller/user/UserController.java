package site.yesaido.frontserver.controller.user;

import feign.FeignException;
import feign.form.FormData;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.controller.AuthResultController;
import site.yesaido.frontserver.dto.react.AuthResultResponse;
import site.yesaido.frontserver.dto.user.request.*;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.exception.FormFlowException;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {

    private static final String PASSWORD_RESET_VERIFIED_EMAIL = "passwordResetVerifiedEmail";
    private static final String LOGIN_URL = "/login";
    private static final String REDIRECT_PREFIX = "redirect:";
    private static final String AUTH_ERROR = "error";
    private static final String RESET_FAILURE_MESSAGE = "비밀번호 변경에 실패했습니다. 다시 시도해 주세요.";
    private static final String LOGIN_FAILURE_MESSAGE = "아이디 또는 비밀번호가 일치하지 않습니다.";
    private static final String RESET_PASSWORD_URL = "/reset-password";
    private static final String RESET_PASSWORD_ERROR = "resetPasswordError";


    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;
    private final ObjectMapper objectMapper;

    @PostMapping("/signup")
    public String signup(@ModelAttribute SignupFormRequest form,
                         @RequestPart(value = "profileImage", required = false)MultipartFile profileImage,
                         HttpSession session) {
        try {
            UserSignUpRequest request = new UserSignUpRequest(form.email(), form.password(), form.nickname(), "USER");
            FormData requestPart = new FormData(MediaType.APPLICATION_JSON_VALUE, "request.json", objectMapper.writeValueAsBytes(request));
            userClient.signUp(requestPart, profileImage);
            setAuthResult(session, "success", "회원가입이 완료되었습니다. 로그인해 주세요.");
            return REDIRECT_PREFIX + LOGIN_URL;
        } catch (Exception exception) {
            throw new FormFlowException(
                    "회원가입을 완료하지 못했습니다.\n입력 내용을 확인해 주세요.",
                    "/signup",
                    null,
                    exception
            );
        }
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpServletResponse response,
                        RedirectAttributes redirectAttributes) {
        try {
            ApiResponse<TokenResponse> apiResponse = userClient.login(new LoginRequest(email, password));
            TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
            if (tokenResponse == null) {
                throw loginFailure(null);
            }
            authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
            redirectAttributes.addFlashAttribute("justLoggedIn", true);
            return "ADMIN".equals(tokenResponse.role()) ? REDIRECT_PREFIX + "/admin" : REDIRECT_PREFIX + "/";
        } catch (feign.FeignException e) {
            String content = e.contentUTF8();
            if(content != null && content.contains("휴면")){
                throw new DormantUserException(email, "휴면 처리된 계정입니다. 이메일 인증을 진행해 주세요.");
            }
            throw loginFailure(e);
        }
    }

    @PostMapping("/reset-password")
    public String resetPassword(
            @RequestParam String newPassword,
            @RequestParam String confirmPassword,
            HttpSession session,
            HttpServletResponse response,
            RedirectAttributes redirectAttributes
    ) {
        String email = getVerifiedEmail(session);

        if (email == null) {
            return REDIRECT_PREFIX + "/find-password";
        }

        if (!newPassword.equals(confirmPassword)) {
            throw resetPasswordFailure("비밀번호가 일치하지 않습니다.", null);
        }

        try {
            userClient.resetPassword(new PasswordResetRequest(email, newPassword));

            session.removeAttribute(PASSWORD_RESET_VERIFIED_EMAIL);
            authCookieProvider.clearAuthCookies(response);

            redirectAttributes.addFlashAttribute(
                    "loginMessage",
                    "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요."
            );
            setAuthResult(session, "success", "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
            return REDIRECT_PREFIX + LOGIN_URL;
        } catch (FeignException.BadRequest e) {
            String errorMessage = extractErrorMessage(e);
            throw resetPasswordFailure(errorMessage, e);
        } catch (FeignException e) {
            throw resetPasswordFailure(RESET_FAILURE_MESSAGE, e);
        }
    }

    private String getVerifiedEmail(HttpSession session) {
        Object email = session.getAttribute(PASSWORD_RESET_VERIFIED_EMAIL);

        if (email instanceof String verifiedEmail && !verifiedEmail.isBlank()) {
            return verifiedEmail;
        }

        return null;
    }

    private void setAuthResult(HttpSession session, String type, String message) {
        session.setAttribute(
                AuthResultController.AUTH_RESULT_SESSION_KEY,
                new AuthResultResponse(type, message)
        );
    }

    private String extractErrorMessage(FeignException e) {
        try {
            JsonNode response = objectMapper.readTree(e.contentUTF8());
            String message = response.path("message").asString();
            return message.isBlank() ? RESET_FAILURE_MESSAGE : message;
        } catch (Exception ignored) {
            return "비밀번호 변경에 실패했습니다.";
        }
    }

    // 관리자 전용 로그인: 일반 로그인과 같은 인증을 쓰되, 응답의 role이 ADMIN이 아니면
    // 로그인 자체를 실패 처리함 (일반 회원 계정으로는 이 창을 통해 로그인할 수 없음)
    @PostMapping("/admin/login")
    public String adminLogin(@RequestParam String email,
                             @RequestParam String password,
                             HttpServletResponse response) {
        ApiResponse<TokenResponse> apiResponse;
        try {
            apiResponse = userClient.login(new LoginRequest(email, password));
        } catch (FeignException e) {
            throw adminLoginFailure(e);
        }

        TokenResponse tokenResponse = apiResponse != null ? apiResponse.data() : null;
        if (tokenResponse == null || !"ADMIN".equals(tokenResponse.role())) {
            throw adminLoginFailure(null);
        }

        authCookieProvider.setAuthCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
        return REDIRECT_PREFIX + "/admin";
    }

    @PostMapping("/users/token/logout")
    public String logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            @CookieValue(name = "accessToken", required = false) String accessToken,
            HttpServletResponse response
    ) {
        try {
            if (refreshToken != null && !refreshToken.isBlank()) {
                userClient.logout(new LogoutRequest(refreshToken, accessToken));
            }
        } catch (FeignException e) {
            log.warn("백엔드 레디스 토큰 삭제 중 예외 발생 : {}", e.getMessage());
        }

        authCookieProvider.clearAuthCookies(response);
        return REDIRECT_PREFIX + LOGIN_URL;
    }

    private FormFlowException loginFailure(Throwable cause) {
        return new FormFlowException(
                LOGIN_FAILURE_MESSAGE,
                LOGIN_URL,
                "loginError",
                cause
        );
    }

    private FormFlowException adminLoginFailure(Throwable cause) {
        return new FormFlowException(
                "관리자 계정 정보가 일치하지 않습니다.",
                "/admin/login",
                null,
                cause
        );
    }

    private FormFlowException resetPasswordFailure(String message, Throwable cause) {
        return new FormFlowException(
                message,
                RESET_PASSWORD_URL,
                RESET_PASSWORD_ERROR,
                cause
        );
    }
}
