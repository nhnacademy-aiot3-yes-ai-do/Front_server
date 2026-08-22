package site.yesaido.frontserver.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.notification.request.SubscriptionCreateRequest;
import site.yesaido.frontserver.dto.notification.request.SubscriptionEnabledRequest;
import site.yesaido.frontserver.dto.notification.response.CultivationOptionResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionResponse;
import site.yesaido.frontserver.dto.notification.response.SubscriptionTypeResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@LoginRequired
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
public class NotificationSubscriptionController {

    private final NotificationClient notificationClient;
    private final CultivationClient cultivationClient;

    @GetMapping("/subscription-types")
    public ResponseEntity<List<SubscriptionTypeResponse>> listTypes() {
        return notificationClient.getSubscriptionTypes();
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<SubscriptionResponse>> listSubscriptions() {
        return notificationClient.getSubscriptions();
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionCreateRequest request
    ) {
        return notificationClient.createSubscription(request);
    }

    @PatchMapping("/subscriptions/{subscriptionId}/enabled")
    public ResponseEntity<SubscriptionResponse> changeEnabled(
            @PathVariable Long subscriptionId,
            @Valid @RequestBody SubscriptionEnabledRequest request
    ) {
        return notificationClient.changeSubscriptionEnabled(subscriptionId, request);
    }

    @DeleteMapping("/subscriptions/{subscriptionId}")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long subscriptionId) {
        notificationClient.deleteSubscription(subscriptionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cultivations")
    public ResponseEntity<List<CultivationOptionResponse>> listCultivations() {
        CultivationSummaryListResponse body = cultivationClient.getCultivations().getBody();
        List<CultivationOptionResponse> options = body == null
                ? List.of()
                : body.cultivationSummaryResponses().stream()
                .map(item -> new CultivationOptionResponse(item.cultivationId(), item.name()))
                .toList();
        return ResponseEntity.ok(options);
    }
}
