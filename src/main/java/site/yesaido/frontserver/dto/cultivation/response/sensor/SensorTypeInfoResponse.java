package site.yesaido.frontserver.dto.cultivation.response.sensor;

public record SensorTypeInfoResponse(
        long id,
        String type,
        String valueUnit
) {
}