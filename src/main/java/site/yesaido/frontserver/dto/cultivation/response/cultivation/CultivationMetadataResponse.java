package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse;

import java.util.List;

public record CultivationMetadataResponse(
        CultivationDetailResponse cultivation,
        CultivationSensorListResponse sensors,
        MushroomReferenceInfoResponse mushroom,
        List<LatestSensorValueResponse> sensorHistory12h
) {
}
