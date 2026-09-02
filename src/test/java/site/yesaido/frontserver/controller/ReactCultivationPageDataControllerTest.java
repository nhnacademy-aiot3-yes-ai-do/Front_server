package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationHistoryPageResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationHistoryResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.react.CultivationDetailPageData;
import site.yesaido.frontserver.dto.react.CultivationListPageData;
import site.yesaido.frontserver.dto.react.CultivationPreviewData;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReactCultivationPageDataControllerTest {

    @Mock
    private CultivationClient cultivationClient;

    @Mock
    private SensorClient sensorClient;

    @InjectMocks
    private ReactCultivationPageDataController controller;

    @Test
    void listPageDataReturnsCultivationsAndMushroomReferences() {
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(
                new CultivationSummaryListResponse(List.of())));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(
                new MushroomReferenceInfoListResponse(List.of())));

        CultivationListPageData result = controller.listPageData();

        assertThat(result.cultivations()).isEmpty();
        assertThat(result.mushrooms()).isEmpty();
    }

    @Test
    void listPageDataUsesEmptyListsWhenResponseBodiesAreNull() {
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(null));

        CultivationListPageData result = controller.listPageData();

        assertThat(result.cultivations()).isEmpty();
        assertThat(result.mushrooms()).isEmpty();
    }

    @Test
    void previewSelectsNewestPhotoAndCalculatesGrowthDays() {
        Long cultivationId = 10L;
        LocalDateTime startedAt = LocalDateTime.now().minusDays(4);
        PhotoResponse oldPhoto = new PhotoResponse(1L, "old", "/old", "S3", startedAt);
        PhotoResponse newestPhoto = new PhotoResponse(2L, "new", "/new", "S3", startedAt.plusDays(1));
        when(cultivationClient.getDetailCultivation(cultivationId)).thenReturn(ResponseEntity.ok(
                new CultivationDetailResponse(cultivationId, "name", 1L, "GROWING", "GROWTH", "OWNER",
                        startedAt, null, startedAt, startedAt)));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(
                new PhotoListResponse(List.of(oldPhoto, newestPhoto))));
        when(sensorClient.getSensors(cultivationId)).thenReturn(ResponseEntity.ok(
                new CultivationSensorListResponse(List.of(), List.of())));
        when(sensorClient.getLatestSensorValues(cultivationId)).thenReturn(ResponseEntity.ok(
                new LatestSensorValueListResponse(List.of())));

        CultivationPreviewData result = controller.preview(cultivationId);

        assertThat(result.cultivation().cultivationId()).isEqualTo(cultivationId);
        assertThat(result.newestPhoto()).isEqualTo(newestPhoto);
        assertThat(result.growthDays()).isEqualTo(5L);
    }

    @Test
    void previewUsesNullNewestPhotoWhenPhotoResponseIsEmpty() {
        Long cultivationId = 11L;
        when(cultivationClient.getDetailCultivation(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(new PhotoListResponse(List.of())));
        when(sensorClient.getSensors(cultivationId)).thenReturn(ResponseEntity.ok(
                new CultivationSensorListResponse(List.of(), List.of())));
        when(sensorClient.getLatestSensorValues(cultivationId)).thenReturn(ResponseEntity.ok(
                new LatestSensorValueListResponse(List.of())));

        CultivationPreviewData result = controller.preview(cultivationId);

        assertThat(result.cultivation()).isNull();
        assertThat(result.growthDays()).isNull();
        assertThat(result.newestPhoto()).isNull();
    }

    @Test
    void detailPageDataUsesSafeEmptyValuesAndExcludesCurrentCultivationFromHistory() {
        Long cultivationId = 20L;
        CultivationHistoryResponse current = new CultivationHistoryResponse(cultivationId, "current", 1L,
                "GROWING", null, null, null);
        CultivationHistoryResponse previous = new CultivationHistoryResponse(21L, "previous", 1L,
                "FINISHED", null, null, null);
        when(cultivationClient.getDetailCultivation(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getSensors(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getLatestSensorValues(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getHistory(0, 50)).thenReturn(ResponseEntity.ok(
                new CultivationHistoryPageResponse(List.of(current, previous), 1, 2, 0, 50)));
        when(sensorClient.getDailyEnvironmentCompliance(org.mockito.ArgumentMatchers.eq(cultivationId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(ResponseEntity.ok(null));

        CultivationDetailPageData result = controller.detailPageData(cultivationId);

        assertThat(result.cultivation()).isNull();
        assertThat(result.members()).isEmpty();
        assertThat(result.photos()).isEmpty();
        assertThat(result.pastCultivations()).containsExactly(previous);
        assertThat(result.mushrooms()).isEmpty();
        assertThat(result.dailyCompliance()).isNull();
    }

    @Test
    void historyDataDelegatesPageAndSizeToClient() {
        CultivationHistoryPageResponse response = new CultivationHistoryPageResponse(List.of(), 0, 0, 2, 10);
        when(cultivationClient.getHistory(2, 10)).thenReturn(ResponseEntity.ok(response));

        ResponseEntity<CultivationHistoryPageResponse> result = controller.historyData(2, 10);

        assertThat(result.getBody()).isSameAs(response);
    }
}
