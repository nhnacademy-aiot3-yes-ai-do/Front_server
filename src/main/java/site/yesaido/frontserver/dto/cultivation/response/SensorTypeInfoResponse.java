package site.yesaido.frontserver.dto.cultivation.response;

public record SensorTypeInfoResponse(
        Long id,
        String type,
        String valueUnit
) {
}
