package site.yesaido.frontserver.controller.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.notification.request.NotificationEventTypeRequest;
import site.yesaido.frontserver.dto.notification.response.NotificationEventTypeListResponse;
import site.yesaido.frontserver.dto.notification.response.NotificationEventTypeResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/notification-events/api")
public class AdminNotificationEventController {

    private final NotificationClient notificationClient;

    @GetMapping
    public ResponseEntity<NotificationEventTypeListResponse> findAll() {
        return UpstreamResponseUtils.isolate(notificationClient.getAdminNotificationEventTypes());
    }

    @PostMapping
    public ResponseEntity<NotificationEventTypeResponse> create(
            @Valid @RequestBody NotificationEventTypeRequest request) {
        return UpstreamResponseUtils.isolate(notificationClient.createAdminNotificationEventType(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationEventTypeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody NotificationEventTypeRequest request) {
        return UpstreamResponseUtils.isolate(notificationClient.updateAdminNotificationEventType(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationClient.deleteAdminNotificationEventType(id);
        return ResponseEntity.noContent().build();
    }
}
