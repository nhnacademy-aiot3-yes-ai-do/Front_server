package site.yesaido.frontserver.dto.notification.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeliveryResponse(
        Long id,
        Long notificationId,
        Long subscriptionId,
        String channelCode,
        String message,
        String status,
        Short attemptCount,
        LocalDateTime sentAt,
        LocalDateTime createdAt
) {
}
