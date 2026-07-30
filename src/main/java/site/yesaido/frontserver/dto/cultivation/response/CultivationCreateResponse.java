package site.yesaido.frontserver.dto.cultivation.response;

import java.util.List;

public record CultivationCreateResponse(
        Long cultivationId,
        Object recommendedEnvironment,
        List<Object> registeredSensors
) {
}
