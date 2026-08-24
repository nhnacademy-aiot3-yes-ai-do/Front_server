package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record SensorTrendPointListResponse(
        long cultivationId,
        String deviceEui,
        String sensorType,
        String unit,
        List<SensorTrendPointResponse> responses
) {
    public SensorTrendPointListResponse {
        responses = responses == null ? List.of() : List.copyOf(responses);
    }
}
