package site.yesaido.frontserver.dto.notification.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SubscriptionCreateRequest(
        @NotNull @Positive Long subscriptionTypeId,
        @NotNull @Positive Long endpointId,
        @NotNull @Positive Long targetId
) {
}
