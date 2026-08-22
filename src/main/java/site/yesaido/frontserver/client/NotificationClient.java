package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.notification.request.EndpointCreateRequest;
import site.yesaido.frontserver.dto.notification.request.EndpointUpdateRequest;
import site.yesaido.frontserver.dto.notification.request.SubscriptionCreateRequest;
import site.yesaido.frontserver.dto.notification.request.SubscriptionEnabledRequest;
import site.yesaido.frontserver.dto.notification.response.DeliveryPageResponse;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionTypeResponse;

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
}
