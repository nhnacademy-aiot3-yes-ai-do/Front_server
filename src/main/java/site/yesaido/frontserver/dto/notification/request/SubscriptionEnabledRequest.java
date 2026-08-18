package site.yesaido.frontserver.dto.notification.request;

import jakarta.validation.constraints.NotNull;

public record SubscriptionEnabledRequest(
        @NotNull Boolean enabled
) {
}
