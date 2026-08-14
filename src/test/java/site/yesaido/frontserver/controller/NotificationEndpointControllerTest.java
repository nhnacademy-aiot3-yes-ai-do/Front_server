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
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.config.WebConfig;
import site.yesaido.frontserver.dto.notification.request.EndpointCreateRequest;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.LoginCheckInterceptor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        value = NotificationEndpointController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import({AuthCookieProvider.class, WebConfig.class, LoginCheckInterceptor.class})
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

        verify(notificationClient).createEndpoint(eq(new EndpointCreateRequest(
                2L, "https://discord.com/api/webhooks/1/token", "우리 농장 알림")));
    }

    @Test
    @DisplayName("Discord Endpoint 삭제")
    void deleteEndpoint() throws Exception {
        given(notificationClient.deleteEndpoint(11L)).willReturn(ResponseEntity.noContent().build());

        mockMvc.perform(delete("/notifications/endpoints/11").cookie(LOGGED_IN))
                .andExpect(status().isNoContent());

        verify(notificationClient).deleteEndpoint(11L);
    }
}
