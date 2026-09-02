package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.notification.request.*;
import site.yesaido.frontserver.dto.notification.response.*;

import java.util.List;

@FeignClient(name = "notificationClient", url = "${feign.client.gateway.url}")
public interface NotificationClient {

    @GetMapping("/api/v1/notifications")
    ResponseEntity<DeliveryPageResponse> getNotifications(
            @RequestParam("page") int page,
            @RequestParam("size") int size
    );

    @GetMapping("/api/v1/notification-endpoints")
    ResponseEntity<List<EndpointResponse>> getEndpoints();

    @PostMapping("/api/v1/notification-endpoints")
    ResponseEntity<EndpointResponse> createEndpoint(@RequestBody EndpointCreateRequest request);

    @PatchMapping("/api/v1/notification-endpoints/{endpointId}")
    ResponseEntity<EndpointResponse> updateEndpoint(
            @PathVariable("endpointId") Long endpointId,
            @RequestBody EndpointUpdateRequest request
    );

    @DeleteMapping("/api/v1/notification-endpoints/{endpointId}")
    ResponseEntity<Void> deleteEndpoint(@PathVariable("endpointId") Long endpointId);

    @PostMapping("/api/v1/telegram-link-sessions")
    ResponseEntity<TelegramLinkSessionResponse> createTelegramLinkSession();

    @GetMapping("/api/v1/telegram-link-sessions/{session-id}")
    ResponseEntity<TelegramLinkStatusResponse> getTelegramLinkSession(@PathVariable("session-id") java.util.UUID sessionId);

    @GetMapping("/api/v1/notification-subscription-types")
    ResponseEntity<List<SubscriptionTypeResponse>> getSubscriptionTypes();

    @GetMapping("/api/v1/notification-subscriptions")
    ResponseEntity<List<SubscriptionResponse>> getSubscriptions();

    @PostMapping("/api/v1/notification-subscriptions")
    ResponseEntity<SubscriptionResponse> createSubscription(@RequestBody SubscriptionCreateRequest request);

    @PatchMapping("/api/v1/notification-subscriptions/{subscriptionId}/enabled")
    ResponseEntity<SubscriptionResponse> changeSubscriptionEnabled(
            @PathVariable("subscriptionId") Long subscriptionId,
            @RequestBody SubscriptionEnabledRequest request
    );

    @DeleteMapping("/api/v1/notification-subscriptions/{subscriptionId}")
    ResponseEntity<Void> deleteSubscription(@PathVariable("subscriptionId") Long subscriptionId);

    @GetMapping("/api/v1/admin/notification-event-types")
    ResponseEntity<NotificationEventTypeListResponse> getAdminNotificationEventTypes();

    @PostMapping("/api/v1/admin/notification-event-types")
    ResponseEntity<NotificationEventTypeResponse> createAdminNotificationEventType(
            @RequestBody NotificationEventTypeRequest request);

    @PutMapping("/api/v1/admin/notification-event-types/{id}")
    ResponseEntity<NotificationEventTypeResponse> updateAdminNotificationEventType(
            @PathVariable("id") Long id,
            @RequestBody NotificationEventTypeRequest request);

    @DeleteMapping("/api/v1/admin/notification-event-types/{id}")
    ResponseEntity<Void> deleteAdminNotificationEventType(@PathVariable("id") Long id);

    @GetMapping("/api/v1/admin/notification-templates")
    ResponseEntity<NotificationTemplateListResponse> getAdminNotificationTemplates();

    @PostMapping("/api/v1/admin/notification-templates")
    ResponseEntity<NotificationTemplateResponse> createAdminNotificationTemplate(@RequestBody NotificationTemplateRequest request);

    @PutMapping("/api/v1/admin/notification-templates/{id}")
    ResponseEntity<NotificationTemplateResponse> updateAdminNotificationTemplate(@PathVariable("id") Long id, @RequestBody NotificationTemplateRequest request);

    @DeleteMapping("/api/v1/admin/notification-templates/{id}")
    ResponseEntity<Void> deleteAdminNotificationTemplate(@PathVariable("id") Long id);

    @GetMapping("/api/v1/admin/channel-types")
    ResponseEntity<ChannelTypeListResponse> getAdminChannelTypes();

    @PostMapping("/api/v1/admin/channel-types")
    ResponseEntity<ChannelTypeResponse> createAdminChannelType(@RequestBody ChannelTypeRequest request);

    @PutMapping("/api/v1/admin/channel-types/{id}")
    ResponseEntity<ChannelTypeResponse> updateAdminChannelType(@PathVariable("id") Long id, @RequestBody ChannelTypeRequest request);

    @DeleteMapping("/api/v1/admin/channel-types/{id}")
    ResponseEntity<Void> deleteAdminChannelType(@PathVariable("id") Long id);

    @PostMapping("/api/v1/admin/channel-types/{id}/restore")
    ResponseEntity<Void> restoreAdminChannelType(@PathVariable("id") Long id);
}
