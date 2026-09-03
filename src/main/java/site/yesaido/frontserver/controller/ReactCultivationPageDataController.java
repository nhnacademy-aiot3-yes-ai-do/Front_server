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
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationMetadataListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationMetadataResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
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
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;
import java.util.stream.Collectors;

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
        CultivationMetadataListResponse metadataResponse = isolated(
                "list cultivation metadata",
                () -> body(cultivationClient.getMetadataList()),
                null
        );
        List<CultivationSummaryResponse> cultivations = metadataResponse == null
                ? List.of()
                : metadataResponse.cultivations().stream()
                .filter(Objects::nonNull)
                .map(CultivationMetadataListResponse.CultivationMetadataListItemResponse::cultivation)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, List<site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse>> latestValues =
                metadataResponse == null ? Map.of() : metadataResponse.cultivations().stream()
                .filter(Objects::nonNull)
                .filter(item -> item.cultivation() != null && item.cultivation().cultivationId() != null)
                .collect(Collectors.toMap(
                        item -> item.cultivation().cultivationId(),
                        CultivationMetadataListResponse.CultivationMetadataListItemResponse::latestSensorValues
                ));
        MushroomReferenceInfoListResponse mushroomResponse = isolated(
                "list mushroom references",
                () -> body(sensorClient.getAllMushroomReferences()),
                new MushroomReferenceInfoListResponse(List.of())
        );

        return new CultivationListPageData(
                cultivations,
                mushroomResponse == null ? List.of() : mushroomResponse.mushroomReferenceInfoResponses(),
                latestValues
        );
    }

    @GetMapping("/{cultivation-id}/preview")
    public CultivationPreviewData preview(@PathVariable("cultivation-id") Long cultivationId) {
        CultivationDetailResponse cultivation = isolated(
                "preview cultivation",
                () -> body(cultivationClient.getDetailCultivation(cultivationId)),
                null
        );
        List<PhotoResponse> photos = safePhotos(isolated(
                "preview photos",
                () -> body(cultivationClient.getPhoto(cultivationId)),
                new PhotoListResponse(List.of())
        ));
        CultivationSensorListResponse sensors = isolated(
                "preview sensors",
                () -> body(sensorClient.getSensors(cultivationId)),
                emptySensors()
        );
        LatestSensorValueListResponse latestValues = isolated(
                "preview latest values",
                () -> body(sensorClient.getLatestSensorValues(cultivationId)),
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
        CultivationMetadataResponse metadata = isolated(
                "detail cultivation metadata",
                () -> body(cultivationClient.getMetadata(cultivationId)),
                null
        );
        CultivationDetailResponse cultivation = metadata == null ? null : metadata.cultivation();
        CultivationSensorListResponse sensors = metadata == null || metadata.sensors() == null
                ? emptySensors() : metadata.sensors();
        LatestSensorValueListResponse latestValues = new LatestSensorValueListResponse(List.of());
        List<site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueResponse> sensorHistory12h =
                metadata == null || metadata.sensorHistory12h() == null ? List.of() : metadata.sensorHistory12h();
        List<MushroomReferenceInfoResponse> mushrooms = metadata == null || metadata.mushroom() == null
                ? List.of() : List.of(metadata.mushroom());
        MemberListResponse memberResponse = body(cultivationClient.getMembers(cultivationId));
        List<PhotoResponse> photos = safePhotos(isolated(
                "detail photos",
                () -> body(cultivationClient.getPhoto(cultivationId)),
                new PhotoListResponse(List.of())
        ));
        EnvironmentComplianceResponse compliance = isolated(
                "daily environment compliance",
                () -> body(sensorClient.getDailyEnvironmentCompliance(cultivationId, LocalDate.now(BUSINESS_ZONE))),
                null
        );

        return new CultivationDetailPageData(
                cultivation,
                growthDays(cultivation),
                safeMembers(memberResponse),
                photos,
                sensors,
                latestValues,
                sensorHistory12h,
                pastCultivations(cultivationId),
                mushrooms,
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
                () -> body(cultivationClient.getHistory(0, 50)),
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

    private <T> T body(ResponseEntity<T> response) {
        return response == null ? null : response.getBody();
    }
}
