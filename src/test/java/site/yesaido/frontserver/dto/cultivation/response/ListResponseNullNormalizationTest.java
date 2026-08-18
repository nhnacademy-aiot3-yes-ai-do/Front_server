package site.yesaido.frontserver.dto.cultivation.response;

import org.junit.jupiter.api.Test;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ListResponseNullNormalizationTest {

    @Test
    void listResponseWrappersNormalizeNullListsToEmptyLists() {
        assertThat(new CultivationSummaryListResponse(null).cultivationSummaryResponses()).isEmpty();
        assertThat(new MemberListResponse(null).memberResponses()).isEmpty();
        assertThat(new PhotoListResponse(null).photoUploadResponses()).isEmpty();
        assertThat(new MushroomReferenceInfoListResponse(null).mushroomReferenceInfoResponses()).isEmpty();
        assertThat(new SensorTypeInfoListResponse(null).sensorTypeInfoResponses()).isEmpty();
        assertThat(new LatestSensorValueListResponse(null).latestSensorValueResponses()).isEmpty();
        assertThat(new CultivationSensorListResponse(null, null).sensors()).isEmpty();
        assertThat(new CultivationSensorListResponse(null, null).environmentSettings()).isEmpty();
    }

    @Test
    void listResponseWrappersExposeUnmodifiableLists() {
        assertUnmodifiable(new CultivationSummaryListResponse(new ArrayList<>()).cultivationSummaryResponses());
        assertUnmodifiable(new MemberListResponse(new ArrayList<>()).memberResponses());
        assertUnmodifiable(new PhotoListResponse(new ArrayList<>()).photoUploadResponses());
        assertUnmodifiable(new MushroomReferenceInfoListResponse(new ArrayList<>()).mushroomReferenceInfoResponses());
        assertUnmodifiable(new SensorTypeInfoListResponse(new ArrayList<>()).sensorTypeInfoResponses());
        assertUnmodifiable(new LatestSensorValueListResponse(new ArrayList<>()).latestSensorValueResponses());
        assertUnmodifiable(new CultivationSensorListResponse(new ArrayList<>(), new ArrayList<>()).sensors());
        assertUnmodifiable(new CultivationSensorListResponse(new ArrayList<>(), new ArrayList<>()).environmentSettings());
    }

    private <T> void assertUnmodifiable(List<T> responses) {
        assertThatThrownBy(() -> responses.add(null))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
