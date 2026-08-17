package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import site.yesaido.frontserver.dto.notification.request.EndpointCreateRequest;
import site.yesaido.frontserver.dto.notification.request.EndpointUpdateRequest;
import site.yesaido.frontserver.dto.notification.response.DeliveryPageResponse;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;

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
}
