package site.yesaido.frontserver.dto.cultivation.response.cultivation;

import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse;

import java.util.List;

public record CultivationMetadataListResponse(
        List<CultivationMetadataListItemResponse> cultivations
) {
    public CultivationMetadataListResponse {
        cultivations = cultivations == null ? List.of() : List.copyOf(cultivations);
    }

    public record CultivationMetadataListItemResponse(
            CultivationSummaryResponse cultivation,
            List<LatestSensorValueResponse> latestSensorValues
    ) {
        public CultivationMetadataListItemResponse {
            latestSensorValues = latestSensorValues == null ? List.of() : List.copyOf(latestSensorValues);
        }
    }
}
