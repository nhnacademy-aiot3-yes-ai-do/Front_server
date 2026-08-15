package site.yesaido.frontserver.dto.cultivation.response.sensor;

public record SensorTypeInfoResponse(
        Long id,
        String type,
        String valueUnit
) {
}
