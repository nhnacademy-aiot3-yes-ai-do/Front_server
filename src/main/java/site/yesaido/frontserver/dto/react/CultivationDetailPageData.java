package site.yesaido.frontserver.dto.react;

import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationHistoryResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.EnvironmentComplianceResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse;

import java.util.List;

public record CultivationDetailPageData(
        CultivationDetailResponse cultivation,
        Long growthDays,
        List<MemberResponse> members,
        List<PhotoResponse> photos,
        CultivationSensorListResponse sensors,
        LatestSensorValueListResponse latestSensorValues,
        List<LatestSensorValueResponse> sensorHistory12h,
        List<CultivationHistoryResponse> pastCultivations,
        List<MushroomReferenceInfoResponse> mushrooms,
        EnvironmentComplianceResponse dailyCompliance
) {
    public CultivationDetailPageData {
        members = members == null ? List.of() : List.copyOf(members);
        photos = photos == null ? List.of() : List.copyOf(photos);
        sensorHistory12h = sensorHistory12h == null ? List.of() : List.copyOf(sensorHistory12h);
        pastCultivations = pastCultivations == null ? List.of() : List.copyOf(pastCultivations);
        mushrooms = mushrooms == null ? List.of() : List.copyOf(mushrooms);
    }
}
