package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record LatestSensorValueListResponse (
        List<LatestSensorValueResponse> latestSensorValueResponses
) {
    public LatestSensorValueListResponse {
        latestSensorValueResponses = latestSensorValueResponses == null ? List.of() : List.copyOf(latestSensorValueResponses);
    }
}