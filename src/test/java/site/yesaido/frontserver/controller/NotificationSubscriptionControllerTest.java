package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.config.WebConfig;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
import site.yesaido.frontserver.dto.notification.request.SubscriptionCreateRequest;
import site.yesaido.frontserver.dto.notification.request.SubscriptionEnabledRequest;
import site.yesaido.frontserver.dto.notification.response.SubscriptionResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionTypeResponse;
import site.yesaido.frontserver.exception.GlobalExceptionHandler;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.LoginCheckInterceptor;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = NotificationSubscriptionController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        AuthCookieProvider.class,
        GlobalExceptionHandler.class,
        WebConfig.class,
        LoginCheckInterceptor.class
})
class NotificationSubscriptionControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationClient notificationClient;

    @MockitoBean
    private CultivationClient cultivationClient;

    @Test
    @DisplayName("로그인 없이 구독 목록 조회 시 로그인으로 이동")
    void listWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/notifications/subscriptions"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("구독 목록 조회")
    void listSubscriptions() throws Exception {
        given(notificationClient.getSubscriptions()).willReturn(ResponseEntity.ok(List.of(
                new SubscriptionResponse(20L, 1L, "환경 이상 알림", "ENVIRONMENT_THRESHOLD_BREACHED",
                        "CULTIVATION", 101L, 10L, "DISCORD", true, null, null)
        )));

        mockMvc.perform(get("/notifications/subscriptions").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(20))
                .andExpect(jsonPath("$[0].targetId").value(101))
                .andExpect(jsonPath("$[0].enabled").value(true));
    }

    @Test
    @DisplayName("구독 목록 조회 시 upstream 헤더를 브라우저 응답으로 전달하지 않음")
    void listSubscriptionsDoesNotRelayUpstreamHeaders() throws Exception {
        given(notificationClient.getSubscriptions()).willReturn(ResponseEntity.ok()
                .header("X-Upstream-Only", "must-not-reach-browser")
                .body(List.of()));

        mockMvc.perform(get("/notifications/subscriptions").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Upstream-Only"));
    }

    @Test
    @DisplayName("구독 종류 목록 조회")
    void listTypes() throws Exception {
        given(notificationClient.getSubscriptionTypes()).willReturn(ResponseEntity.ok(List.of(
                new SubscriptionTypeResponse(1L, "환경 이상 알림", "재배 환경 이상",
                        "ENVIRONMENT_THRESHOLD_BREACHED", "CULTIVATION")
        )));

        mockMvc.perform(get("/notifications/subscription-types").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("ENVIRONMENT_THRESHOLD_BREACHED"));
    }

    @Test
    @DisplayName("구독 생성")
    void createSubscription() throws Exception {
        SubscriptionCreateRequest request = new SubscriptionCreateRequest(1L, 10L, 101L);
        given(notificationClient.createSubscription(request)).willReturn(ResponseEntity.status(201).body(
                new SubscriptionResponse(20L, 1L, "환경 이상 알림", "ENVIRONMENT_THRESHOLD_BREACHED",
                        "CULTIVATION", 101L, 10L, "DISCORD", true, null, null)
        ));

        mockMvc.perform(post("/notifications/subscriptions")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subscriptionTypeId":1,"endpointId":10,"targetId":101}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(20));
    }

    @Test
    @DisplayName("구독 활성 변경")
    void changeEnabled() throws Exception {
        given(notificationClient.changeSubscriptionEnabled(20L, new SubscriptionEnabledRequest(false)))
                .willReturn(ResponseEntity.ok(new SubscriptionResponse(
                        20L, 1L, "환경 이상 알림", "ENVIRONMENT_THRESHOLD_BREACHED",
                        "CULTIVATION", 101L, 10L, "DISCORD", false, null, null)));

        mockMvc.perform(patch("/notifications/subscriptions/20/enabled")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @DisplayName("구독 토글 변경 시 upstream 헤더를 브라우저 응답으로 전달하지 않음")
    void changeEnabledDoesNotRelayUpstreamHeaders() throws Exception {
        given(notificationClient.changeSubscriptionEnabled(20L, new SubscriptionEnabledRequest(false)))
                .willReturn(ResponseEntity.ok()
                        .header("X-Upstream-Only", "must-not-reach-browser")
                        .body(new SubscriptionResponse(
                                20L, 1L, "환경 이상 알림", "ENVIRONMENT_THRESHOLD_BREACHED",
                                "CULTIVATION", 101L, 10L, "DISCORD", false, null, null)));

        mockMvc.perform(patch("/notifications/subscriptions/20/enabled")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Upstream-Only"));
    }

    @Test
    @DisplayName("구독 삭제")
    void deleteSubscription() throws Exception {
        given(notificationClient.deleteSubscription(20L)).willReturn(ResponseEntity.noContent().build());

        mockMvc.perform(delete("/notifications/subscriptions/20").cookie(LOGGED_IN))
                .andExpect(status().isNoContent());

        verify(notificationClient).deleteSubscription(20L);
    }

    @Test
    @DisplayName("구독 생성 필수값이 없으면 400")
    void createSubscriptionRejectsBlankBody() throws Exception {
        mockMvc.perform(post("/notifications/subscriptions")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subscriptionTypeId":1,"endpointId":10}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("재배지 옵션은 기존 Cultivation 목록 API를 그대로 사용")
    void listCultivations() throws Exception {
        given(cultivationClient.getCultivations()).willReturn(ResponseEntity.ok(new CultivationSummaryListResponse(List.of(
                new CultivationSummaryResponse(3L, "느타리 1번", 1L, "GROWTH", "GROWTH", 1, "오너", null)
        ))));

        mockMvc.perform(get("/notifications/cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cultivationId").value(3))
                .andExpect(jsonPath("$[0].name").value("느타리 1번"));
    }

    @Test
    @DisplayName("재배지 응답 본문이 없으면 빈 목록")
    void listCultivationsWithEmptyBody() throws Exception {
        given(cultivationClient.getCultivations()).willReturn(ResponseEntity.ok().build());

        mockMvc.perform(get("/notifications/cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
