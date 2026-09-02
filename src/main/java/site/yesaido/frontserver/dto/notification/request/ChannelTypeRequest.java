package site.yesaido.frontserver.dto.notification.request;

import jakarta.validation.constraints.NotBlank;

public record ChannelTypeRequest(@NotBlank String code, @NotBlank String displayName) {
}
