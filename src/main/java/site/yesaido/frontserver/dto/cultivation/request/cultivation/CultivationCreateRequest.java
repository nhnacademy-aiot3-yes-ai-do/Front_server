package site.yesaido.frontserver.dto.cultivation.request.cultivation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CultivationCreateRequest(
    @NotBlank
    @Size(max = 100)
    String name,

    @NotNull
    Long mushroomId,

    @NotEmpty
    List<@NotNull @Valid EnvironmentSettingRequest> environmentSettingRequests
) {
}
