package site.yesaido.frontserver.controller.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.notification.request.*;
import site.yesaido.frontserver.dto.notification.response.*;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

import java.util.List;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/notification-events/api")
public class AdminNotificationTemplateChannelController {
    private final NotificationClient client;

    @GetMapping("/templates")
    public ResponseEntity<List<NotificationTemplateResponse>> templates() {
        return UpstreamResponseUtils.isolate(client.getAdminNotificationTemplates());
    }

    @PostMapping("/templates")
    public ResponseEntity<NotificationTemplateResponse> createTemplate(@Valid @RequestBody NotificationTemplateRequest r) {
        return UpstreamResponseUtils.isolate(client.createAdminNotificationTemplate(r));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<NotificationTemplateResponse> updateTemplate(@PathVariable Long id, @Valid @RequestBody NotificationTemplateRequest r) {
        return UpstreamResponseUtils.isolate(client.updateAdminNotificationTemplate(id, r));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        client.deleteAdminNotificationTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/channels")
    public ResponseEntity<List<ChannelTypeResponse>> channels() {
        return UpstreamResponseUtils.isolate(client.getAdminChannelTypes());
    }

    @PostMapping("/channels")
    public ResponseEntity<ChannelTypeResponse> createChannel(@Valid @RequestBody ChannelTypeRequest r) {
        return UpstreamResponseUtils.isolate(client.createAdminChannelType(r));
    }

    @PutMapping("/channels/{id}")
    public ResponseEntity<ChannelTypeResponse> updateChannel(@PathVariable Long id, @Valid @RequestBody ChannelTypeRequest r) {
        return UpstreamResponseUtils.isolate(client.updateAdminChannelType(id, r));
    }

    @DeleteMapping("/channels/{id}")
    public ResponseEntity<Void> deleteChannel(@PathVariable Long id) {
        client.deleteAdminChannelType(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/channels/{id}/restore")
    public ResponseEntity<Void> restoreChannel(@PathVariable Long id) {
        client.restoreAdminChannelType(id);
        return ResponseEntity.noContent().build();
    }
}
