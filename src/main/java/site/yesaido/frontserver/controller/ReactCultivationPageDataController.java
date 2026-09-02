package site.yesaido.frontserver.controller;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationHistoryPageResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationHistoryResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.EnvironmentComplianceResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.react.CultivationDetailPageData;
import site.yesaido.frontserver.dto.react.CultivationListPageData;
import site.yesaido.frontserver.dto.react.CultivationPreviewData;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@RestController
@LoginRequired
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class ReactCultivationPageDataController {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final CultivationClient cultivationClient;
    private final SensorClient sensorClient;

    @GetMapping("/page-data")
    public CultivationListPageData listPageData() {
        CultivationSummaryListResponse cultivationResponse = cultivationClient.getCultivations().getBody();
        MushroomReferenceInfoListResponse mushroomResponse = isolated(
                "list mushroom references",
                () -> sensorClient.getAllMushroomReferences().getBody(),
                new MushroomReferenceInfoListResponse(List.of())
        );

        return new CultivationListPageData(
                cultivationResponse == null ? List.of() : cultivationResponse.cultivationSummaryResponses(),
                mushroomResponse == null ? List.of() : mushroomResponse.mushroomReferenceInfoResponses()
        );
    }

    @GetMapping("/{cultivation-id}/preview")
    public CultivationPreviewData preview(@PathVariable("cultivation-id") Long cultivationId) {
        CultivationDetailResponse cultivation = cultivationClient.getDetailCultivation(cultivationId).getBody();
        List<PhotoResponse> photos = safePhotos(isolated(
                "preview photos",
                () -> cultivationClient.getPhoto(cultivationId).getBody(),
                new PhotoListResponse(List.of())
        ));
        CultivationSensorListResponse sensors = isolated(
                "preview sensors",
                () -> sensorClient.getSensors(cultivationId).getBody(),
                emptySensors()
        );
        LatestSensorValueListResponse latestValues = isolated(
                "preview latest values",
                () -> sensorClient.getLatestSensorValues(cultivationId).getBody(),
                new LatestSensorValueListResponse(List.of())
        );

        PhotoResponse newestPhoto = photos.stream()
                .filter(photo -> photo.updatedAt() != null)
                .max(Comparator.comparing(PhotoResponse::updatedAt))
                .orElseGet(() -> photos.stream().findFirst().orElse(null));

        return new CultivationPreviewData(
                cultivation,
                growthDays(cultivation),
                newestPhoto,
                sensors,
                latestValues
        );
    }

    @GetMapping("/{cultivation-id}/page-data")
    public CultivationDetailPageData detailPageData(@PathVariable("cultivation-id") Long cultivationId) {
        CultivationDetailResponse cultivation = cultivationClient.getDetailCultivation(cultivationId).getBody();
        MemberListResponse memberResponse = cultivationClient.getMembers(cultivationId).getBody();
        List<PhotoResponse> photos = safePhotos(isolated(
                "detail photos",
                () -> cultivationClient.getPhoto(cultivationId).getBody(),
                new PhotoListResponse(List.of())
        ));
        CultivationSensorListResponse sensors = isolated(
                "detail sensors",
                () -> sensorClient.getSensors(cultivationId).getBody(),
                emptySensors()
        );
        LatestSensorValueListResponse latestValues = isolated(
                "detail latest values",
                () -> sensorClient.getLatestSensorValues(cultivationId).getBody(),
                new LatestSensorValueListResponse(List.of())
        );
        MushroomReferenceInfoListResponse mushroomResponse = isolated(
                "detail mushroom references",
                () -> sensorClient.getAllMushroomReferences().getBody(),
                new MushroomReferenceInfoListResponse(List.of())
        );
        EnvironmentComplianceResponse compliance = isolated(
                "daily environment compliance",
                () -> sensorClient.getDailyEnvironmentCompliance(cultivationId, LocalDate.now(BUSINESS_ZONE)).getBody(),
                null
        );

        return new CultivationDetailPageData(
                cultivation,
                growthDays(cultivation),
                safeMembers(memberResponse),
                photos,
                sensors,
                latestValues,
                pastCultivations(cultivationId),
                safeMushrooms(mushroomResponse),
                compliance
        );
    }

    @GetMapping("/history/data")
    public ResponseEntity<CultivationHistoryPageResponse> historyData(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return UpstreamResponseUtils.isolate(cultivationClient.getHistory(page, size));
    }

    private List<CultivationHistoryResponse> pastCultivations(Long cultivationId) {
        CultivationHistoryPageResponse response = isolated(
                "past cultivations",
                () -> cultivationClient.getHistory(0, 50).getBody(),
                null
        );
        if (response == null || response.content() == null) {
            return List.of();
        }
        return response.content().stream()
                .filter(item -> !cultivationId.equals(item.cultivationId()))
                .toList();
    }

    private List<MemberResponse> safeMembers(MemberListResponse response) {
        return response == null || response.memberResponses() == null
                ? List.of()
                : response.memberResponses();
    }

    private List<MushroomReferenceInfoResponse> safeMushrooms(MushroomReferenceInfoListResponse response) {
        return response == null || response.mushroomReferenceInfoResponses() == null
                ? List.of()
                : response.mushroomReferenceInfoResponses();
    }

    private List<PhotoResponse> safePhotos(PhotoListResponse response) {
        return response == null || response.photoUploadResponses() == null
                ? List.of()
                : response.photoUploadResponses();
    }
    private Long growthDays(CultivationDetailResponse cultivation) {
        if (cultivation == null || cultivation.startedAt() == null) {
            return null;
        }
        return ChronoUnit.DAYS.between(
                cultivation.startedAt().toLocalDate(),
                LocalDate.now(BUSINESS_ZONE)
        ) + 1;
    }

    private CultivationSensorListResponse emptySensors() {
        return new CultivationSensorListResponse(List.of(), List.of());
    }

    private <T> T isolated(String operation, Supplier<T> supplier, T fallback) {
        try {
            T value = supplier.get();
            return value == null ? fallback : value;
        } catch (FeignException.Unauthorized | FeignException.Forbidden exception) {
            throw exception;
        } catch (FeignException exception) {
            log.warn("React page data dependency failed: operation={}, status={}", operation, exception.status());
            return fallback;
        }
    }
}
