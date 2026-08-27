package site.yesaido.frontserver.controller;

import feign.FeignException;
import feign.Request;
import feign.Response;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.config.WebConfig;
import site.yesaido.frontserver.dto.notification.request.EndpointCreateRequest;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;
import site.yesaido.frontserver.dto.notification.response.TelegramLinkSessionResponse;
import site.yesaido.frontserver.dto.notification.response.TelegramLinkStatusResponse;
import site.yesaido.frontserver.exception.GlobalExceptionHandler;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.LoginCheckInterceptor;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = NotificationEndpointController.class,
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
class NotificationEndpointControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationClient notificationClient;

    @Test
    @DisplayName("로그인 없이 Endpoint 목록 조회 시 로그인으로 이동")
    void listWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/notifications/endpoints"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("Endpoint 목록 조회")
    void listEndpoints() throws Exception {
        given(notificationClient.getEndpoints()).willReturn(ResponseEntity.ok(List.of(
                new EndpointResponse(10L, 2L, "DISCORD", "Discord", "https://discord.com/api/webhooks/***",
                        "농장 알림", true, null, null)
        )));

        mockMvc.perform(get("/notifications/endpoints").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].channelCode").value("DISCORD"))
                .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    @DisplayName("Endpoint 목록 조회 중 알림 서버 오류 발생 시 알림 서비스 안내 메시지 반환")
    void listEndpointsPropagatesNotificationServerError() throws Exception {
        given(notificationClient.getEndpoints()).willThrow(feignException(503));

        mockMvc.perform(get("/notifications/endpoints").cookie(LOGGED_IN))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value("알림 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요."));
    }

    @Test
    @DisplayName("Endpoint 목록 조회 중 인증 오류가 발생하면 로그인으로 이동")
    void listEndpointsUnauthorizedRedirectsToLogin() throws Exception {
        given(notificationClient.getEndpoints()).willThrow(feignException(401));

        mockMvc.perform(get("/notifications/endpoints").cookie(LOGGED_IN))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("Discord Endpoint 생성 시 설정된 channelTypeId를 붙인다")
    void createDiscordEndpointUsesConfiguredChannelTypeId() throws Exception {
        given(notificationClient.createEndpoint(any(EndpointCreateRequest.class)))
                .willReturn(ResponseEntity.status(201).body(
                        new EndpointResponse(11L, 2L, "DISCORD", "Discord",
                                "https://discord.com/api/webhooks/***", "우리 농장 알림", true, null, null)
                ));

        mockMvc.perform(post("/notifications/endpoints")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"destination":"https://discord.com/api/webhooks/1/token","displayName":"우리 농장 알림"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.channelCode").value("DISCORD"));

        verify(notificationClient).createEndpoint(new EndpointCreateRequest(
                2L, "https://discord.com/api/webhooks/1/token", "우리 농장 알림"));
    }

    @Test
    @DisplayName("Discord가 아닌 Webhook URL은 Endpoint 생성 요청 전에 거부")
    void createDiscordEndpointRejectsNonDiscordUrl() throws Exception {
        mockMvc.perform(post("/notifications/endpoints")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"destination":"https://example.com/api/webhooks/1/token","displayName":"우리 농장 알림"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Telegram 연동 세션 생성 요청을 알림 서버로 전달")
    void createsTelegramLinkSession() throws Exception {
        given(notificationClient.createTelegramLinkSession()).willReturn(ResponseEntity.status(201)
                .header(HttpHeaders.TRANSFER_ENCODING, "chunked")
                .location(URI.create("/api/v1/telegram-link-sessions/11111111-1111-1111-1111-111111111111"))
                .body(new TelegramLinkSessionResponse(
                        java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"),
                        "PENDING", "https://t.me/bot?start=opaque", java.time.Instant.parse("2026-08-25T03:00:00Z"))));

        mockMvc.perform(post("/notifications/endpoints/telegram-link-sessions").cookie(LOGGED_IN))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist(HttpHeaders.TRANSFER_ENCODING))
                .andExpect(header().string(HttpHeaders.LOCATION,
                        "/api/v1/telegram-link-sessions/11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.deepLink").value("https://t.me/bot?start=opaque"));

        verify(notificationClient).createTelegramLinkSession();
    }

    @Test
    @DisplayName("Telegram 연동 세션 상태 조회를 알림 서버로 전달")
    void getsTelegramLinkSession() throws Exception {
        java.util.UUID sessionId = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(notificationClient.getTelegramLinkSession(sessionId)).willReturn(ResponseEntity.ok()
                .header(HttpHeaders.TRANSFER_ENCODING, "chunked")
                .body(new TelegramLinkStatusResponse(sessionId, "LINKED")));

        mockMvc.perform(get("/notifications/endpoints/telegram-link-sessions/{session-id}", sessionId).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.TRANSFER_ENCODING))
                .andExpect(jsonPath("$.sessionId").value(sessionId.toString()))
                .andExpect(jsonPath("$.status").value("LINKED"));

        verify(notificationClient).getTelegramLinkSession(sessionId);
    }

    @Test
    @DisplayName("로그인 없이 Telegram 연동 세션 상태를 조회하면 로그인으로 이동")
    void getTelegramLinkSessionWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/notifications/endpoints/telegram-link-sessions/{session-id}",
                        "11111111-1111-1111-1111-111111111111"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verifyNoInteractions(notificationClient);
    }

    @Test
    @DisplayName("없는 Telegram 연동 세션 상태 조회는 알림 정보 없음으로 반환")
    void getTelegramLinkSessionNotFoundReturnsNotificationNotFound() throws Exception {
        java.util.UUID sessionId = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(notificationClient.getTelegramLinkSession(sessionId)).willThrow(feignException(404));

        mockMvc.perform(get("/notifications/endpoints/telegram-link-sessions/{session-id}", sessionId).cookie(LOGGED_IN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("해당 알림 정보를 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("Telegram 연동 세션 상태 조회 중 인증 오류가 발생하면 로그인으로 이동")
    void getTelegramLinkSessionUnauthorizedRedirectsToLogin() throws Exception {
        java.util.UUID sessionId = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(notificationClient.getTelegramLinkSession(sessionId)).willThrow(feignException(401));

        mockMvc.perform(get("/notifications/endpoints/telegram-link-sessions/{session-id}", sessionId).cookie(LOGGED_IN))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("Telegram 연동 세션 상태 조회 중 알림 서버 오류는 서비스 안내 메시지로 반환")
    void getTelegramLinkSessionPropagatesNotificationServerError() throws Exception {
        java.util.UUID sessionId = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
        given(notificationClient.getTelegramLinkSession(sessionId)).willThrow(feignException(503));

        mockMvc.perform(get("/notifications/endpoints/telegram-link-sessions/{session-id}", sessionId).cookie(LOGGED_IN))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value("알림 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요."));
    }

    @Test
    @DisplayName("Discord Endpoint 삭제")
    void deleteEndpoint() throws Exception {
        given(notificationClient.deleteEndpoint(11L)).willReturn(ResponseEntity.noContent().build());

        mockMvc.perform(delete("/notifications/endpoints/11").cookie(LOGGED_IN))
                .andExpect(status().isNoContent());

        verify(notificationClient).deleteEndpoint(11L);
    }

    private static FeignException feignException(int status) {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "/api/v1/notification-endpoints",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                null
        );
        Response response = Response.builder()
                .status(status)
                .reason("Service Unavailable")
                .request(request)
                .headers(Collections.emptyMap())
                .body("{\"detail\":\"알림 서버를 사용할 수 없습니다.\"}", StandardCharsets.UTF_8)
                .build();
        return FeignException.errorStatus("NotificationClient#getEndpoints()", response);
    }
}
