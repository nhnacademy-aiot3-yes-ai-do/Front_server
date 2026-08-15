package site.yesaido.frontserver.dto.cultivation.response.sensor;

public record CultivationSensorTypeResponse(
        Long sensorTypeId,
        String type,
        String valueUnit
) {
}
