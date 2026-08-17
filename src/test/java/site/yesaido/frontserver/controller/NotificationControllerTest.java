package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
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
import site.yesaido.frontserver.dto.notification.response.DeliveryPageResponse;
import site.yesaido.frontserver.dto.notification.response.DeliveryResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = NotificationController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationClient notificationClient;

    @Test
    void getNotificationsReturnsDeliveryPage() throws Exception {
        DeliveryPageResponse body = new DeliveryPageResponse(
                List.of(new DeliveryResponse(
                        1L, 10L, 20L, "TELEGRAM", "수확이 완료되었습니다.", "SENT",
                        (short) 1, null, null
                )),
                0, 5, 1, 1, false
        );
        given(notificationClient.getNotifications(0, 5))
                .willReturn(ResponseEntity.ok(body));

        mockMvc.perform(get("/notifications")
                        .param("page", "0")
                        .param("size", "5")
                        .cookie(new Cookie("accessToken", "demo-access-token")))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content[0].message").value("수확이 완료되었습니다."))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getNotificationsWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/notifications"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }
}
