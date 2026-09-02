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
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.config.MethodOverrideConfig;
import site.yesaido.frontserver.controller.admin.AdminNotificationTemplateChannelController;
import site.yesaido.frontserver.dto.notification.request.ChannelTypeRequest;
import site.yesaido.frontserver.dto.notification.request.NotificationTemplateRequest;
import site.yesaido.frontserver.dto.notification.response.ChannelTypeListResponse;
import site.yesaido.frontserver.dto.notification.response.ChannelTypeResponse;
import site.yesaido.frontserver.dto.notification.response.NotificationTemplateListResponse;
import site.yesaido.frontserver.dto.notification.response.NotificationTemplateResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = AdminNotificationTemplateChannelController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc
@Import({AuthCookieProvider.class, MethodOverrideConfig.class})
class AdminNotificationTemplateChannelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NotificationClient notificationClient;

    private static final Cookie ADMIN_COOKIE = new Cookie("role", "ADMIN");
    private static final Cookie ACCESS_COOKIE = new Cookie("accessToken", "adminToken");

    @Test
    @DisplayName("템플릿 목록 조회")
    void templates() throws Exception {
        NotificationTemplateResponse template = new NotificationTemplateResponse(1L, 10L, "HARVEST_DONE", 20L, "DISCORD", "수확이 끝났어요", 1);
        when(notificationClient.getAdminNotificationTemplates())
                .thenReturn(ResponseEntity.ok(new NotificationTemplateListResponse(List.of(template))));

        mockMvc.perform(get("/admin/notification-events/api/templates").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notificationTemplateResponses[0].id").value(1));

        verify(notificationClient).getAdminNotificationTemplates();
    }

    @Test
    @DisplayName("템플릿 생성")
    void createTemplate() throws Exception {
        NotificationTemplateRequest request = new NotificationTemplateRequest(10L, 20L, "수확이 끝났어요", 1);
        NotificationTemplateResponse response = new NotificationTemplateResponse(1L, 10L, "HARVEST_DONE", 20L, "DISCORD", "수확이 끝났어요", 1);
        when(notificationClient.createAdminNotificationTemplate(request))
                .thenReturn(ResponseEntity.ok(response));

        mockMvc.perform(post("/admin/notification-events/api/templates")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        verify(notificationClient).createAdminNotificationTemplate(request);
    }

    @Test
    @DisplayName("템플릿 생성 - bodyTemplate이 빈 값이면 400")
    void createTemplateWithBlankBodyRejected() throws Exception {
        NotificationTemplateRequest invalidRequest = new NotificationTemplateRequest(10L, 20L, "", 1);

        mockMvc.perform(post("/admin/notification-events/api/templates")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("템플릿 수정")
    void updateTemplate() throws Exception {
        NotificationTemplateRequest request = new NotificationTemplateRequest(10L, 20L, "변경된 문구", 2);
        NotificationTemplateResponse response = new NotificationTemplateResponse(1L, 10L, "HARVEST_DONE", 20L, "DISCORD", "변경된 문구", 2);
        when(notificationClient.updateAdminNotificationTemplate(1L, request))
                .thenReturn(ResponseEntity.ok(response));

        mockMvc.perform(put("/admin/notification-events/api/templates/1")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        verify(notificationClient).updateAdminNotificationTemplate(1L, request);
    }

    @Test
    @DisplayName("템플릿 삭제 - 204 No Content")
    void deleteTemplate() throws Exception {
        mockMvc.perform(delete("/admin/notification-events/api/templates/1").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isNoContent());

        verify(notificationClient).deleteAdminNotificationTemplate(1L);
    }

    @Test
    @DisplayName("채널 목록 조회")
    void channels() throws Exception {
        ChannelTypeResponse channel = new ChannelTypeResponse(1L, "DISCORD", "디스코드", false);
        when(notificationClient.getAdminChannelTypes())
                .thenReturn(ResponseEntity.ok(new ChannelTypeListResponse(List.of(channel))));

        mockMvc.perform(get("/admin/notification-events/api/channels").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelTypeResponses[0].code").value("DISCORD"));

        verify(notificationClient).getAdminChannelTypes();
    }

    @Test
    @DisplayName("채널 생성")
    void createChannel() throws Exception {
        ChannelTypeRequest request = new ChannelTypeRequest("DISCORD", "디스코드");
        ChannelTypeResponse response = new ChannelTypeResponse(1L, "DISCORD", "디스코드", false);
        when(notificationClient.createAdminChannelType(request))
                .thenReturn(ResponseEntity.ok(response));

        mockMvc.perform(post("/admin/notification-events/api/channels")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("DISCORD"));

        verify(notificationClient).createAdminChannelType(request);
    }

    @Test
    @DisplayName("채널 생성 - code가 빈 값이면 400")
    void createChannelWithBlankCodeRejected() throws Exception {
        ChannelTypeRequest invalidRequest = new ChannelTypeRequest("", "디스코드");

        mockMvc.perform(post("/admin/notification-events/api/channels")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("채널 수정")
    void updateChannel() throws Exception {
        ChannelTypeRequest request = new ChannelTypeRequest("DISCORD", "변경된 이름");
        ChannelTypeResponse response = new ChannelTypeResponse(1L, "DISCORD", "변경된 이름", false);
        when(notificationClient.updateAdminChannelType(1L, request))
                .thenReturn(ResponseEntity.ok(response));

        mockMvc.perform(put("/admin/notification-events/api/channels/1")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("변경된 이름"));

        verify(notificationClient).updateAdminChannelType(1L, request);
    }

    @Test
    @DisplayName("채널 삭제 - 204 No Content")
    void deleteChannel() throws Exception {
        mockMvc.perform(delete("/admin/notification-events/api/channels/1").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isNoContent());

        verify(notificationClient).deleteAdminChannelType(1L);
    }

    @Test
    @DisplayName("채널 복구 - 204 No Content")
    void restoreChannel() throws Exception {
        mockMvc.perform(post("/admin/notification-events/api/channels/1/restore").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isNoContent());

        verify(notificationClient).restoreAdminChannelType(1L);
    }
}