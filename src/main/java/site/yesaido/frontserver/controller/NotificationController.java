package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.notification.response.DeliveryPageResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

@LoginRequired
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationClient notificationClient;

    @GetMapping
    public ResponseEntity<DeliveryPageResponse> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return UpstreamResponseUtils.isolate(notificationClient.getNotifications(page, size));
    }
}
