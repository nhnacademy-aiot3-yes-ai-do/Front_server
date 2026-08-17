package site.yesaido.frontserver.dto.cultivation.response.sensor;

import java.util.List;

public record SensorTypeInfoListResponse(
        List<SensorTypeInfoResponse> sensorTypeInfoResponses
) {
}
