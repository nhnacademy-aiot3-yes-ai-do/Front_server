package site.yesaido.frontserver.controller.user;

import feign.FeignException;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttribute;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.notification.response.CultivationOptionResponse;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionTypeResponse;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserViewController {
    private static final String PASSWORD_RESET_VERIFIED_EMAIL = "passwordResetVerifiedEmail";

    private final NotificationClient notificationClient;
    private final MeterRegistry meterRegistry;
    private final CultivationClient cultivationClient;
    private final ViewJsonWriter viewJsonWriter;

    // ===== 인증 (Auth) 관련 뷰 =====

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/admin/login")
    public String adminLoginPage() {
        return "auth/admin-login";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "auth/signup";
    }

    @GetMapping({"/signup/nickname", "/signup-nickname"})
    public String signupNicknamePage(@RequestParam(required = false) String email,
                                     @RequestParam(required = false) String password,
                                     Model model) {
        if (email != null) model.addAttribute("email", email);
        if (password != null) model.addAttribute("password", password);
        return "auth/signup-nickname";
    }

    @GetMapping("/find-password")
    public String findPasswordPage() {
        return "auth/find-password";
    }

    @GetMapping("/verify-code")
    public String verifyCodePage(@RequestParam(required = false) String email,
                                 Model model) {
        if (email != null) model.addAttribute("email", email);
        return "auth/verify-code";
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage(@SessionAttribute(name = PASSWORD_RESET_VERIFIED_EMAIL, required = false) String verifiedEmail) {
        if(verifiedEmail == null || verifiedEmail.isBlank()){
            return "redirect:/find-password";
        }
        return "auth/reset-password";
    }

    // ===== 마이페이지 (User) 관련 뷰 =====

    @GetMapping("/mypage")
    public String mypage() {
        return "user/profile";
    }

    @GetMapping("/mypage/notifications")
    public String notificationSettingsPage(Model model) {
        Map<String, Boolean> fetchErrors = new LinkedHashMap<>();
        List<EndpointResponse> endpoints = fetchOrEmpty("endpoints", notificationClient::getEndpoints, fetchErrors);
        List<SubscriptionTypeResponse> subscriptionTypes = fetchOrEmpty("subscription-types", notificationClient::getSubscriptionTypes, fetchErrors);
        List<SubscriptionResponse> subscriptions = fetchOrEmpty("subscriptions", notificationClient::getSubscriptions, fetchErrors);
        List<CultivationOptionResponse> cultivationOptions = fetchOrEmpty("cultivations",
                () -> ResponseEntity.ok(fetchCultivationOptions()), fetchErrors);

        model.addAttribute("endpointsJson", viewJsonWriter.toScriptJson(endpoints));
        model.addAttribute("subscriptionTypesJson", viewJsonWriter.toScriptJson(subscriptionTypes));
        model.addAttribute("subscriptionsJson", viewJsonWriter.toScriptJson(subscriptions));
        model.addAttribute("cultivationOptionsJson", viewJsonWriter.toScriptJson(cultivationOptions));
        model.addAttribute("notificationFetchErrorsJson", viewJsonWriter.toScriptJson(fetchErrors));
        return "user/notification-settings";
    }

    // Helper Method
    private <T> List<T> fetchOrEmpty(String endpoints, Supplier<ResponseEntity<List<T>>> supplier,
                                     Map<String, Boolean> fetchErrors) {
        try {
            ResponseEntity<List<T>> response = supplier.get();
            List<T> result = response == null ? null : response.getBody();
            return result == null ? List.of() : result;
        } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
            throw e;
        } catch (FeignException e) {
            fetchErrors.put(endpoints, true);
            log.warn("알림 설정 페이지 데이터 조회 실패 (endpoint={}, status={}): {}", endpoints, e.status(), e.getMessage());
            meterRegistry.counter("notification-settings.fetch.failure", "endpoints", endpoints).increment();
            return List.of();
        }
    }

    private List<CultivationOptionResponse> fetchCultivationOptions() {
        ResponseEntity<CultivationSummaryListResponse> response = cultivationClient.getCultivations();
        CultivationSummaryListResponse body = response == null ? null : response.getBody();
        if (body == null) {
            return List.of();
        }
        return body.cultivationSummaryResponses().stream()
                .map(item -> new CultivationOptionResponse(item.cultivationId(), item.name()))
                .toList();
    }
}
