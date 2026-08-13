package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import site.yesaido.frontserver.dto.notification.response.DeliveryPageResponse;

@FeignClient(name = "notificationClient", url = "${feign.client.gateway.url}")
public interface NotificationClient {

    @GetMapping("/api/v1/notifications")
    ResponseEntity<DeliveryPageResponse> getNotifications(
            @RequestParam("page") int page,
            @RequestParam("size") int size
    );
}
