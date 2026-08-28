package site.yesaido.frontserver.controller;

import feign.FeignException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;
import site.yesaido.frontserver.dto.cultivation.request.cultivation.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddFormRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberRoleUpdateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.OwnerTransferRequest;
import site.yesaido.frontserver.dto.cultivation.request.harvest.HarvestCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.*;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.UserSearchResponse;
import site.yesaido.frontserver.dto.cultivation.response.harvest.HarvestCreateResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class CultivationController {
    private static final String MUSHROOMS_JSON = "mushroomsJson";

    private final CultivationClient cultivationClient;
    private final SensorClient sensorClient;
    private final UserClient userClient;
    private final AiClient aiClient;
    private final ViewJsonWriter viewJsonWriter;

    @GetMapping
    public String list(Model model) {
        CultivationSummaryListResponse cultivationSummaryListResponse = cultivationClient.getCultivations().getBody();
        List<CultivationSummaryResponse> cultivations = cultivationSummaryListResponse == null
                ? List.of()
                : cultivationSummaryListResponse.cultivationSummaryResponses();
        SensorTypeInfoListResponse sensorTypes = sensorClient.getSensorTypes().getBody();
        List<CultivationListItemView> cultivationItems = cultivations.stream()
                .map(cultivation -> {
                    CultivationSensorListResponse response = sensorClient.getSensors(cultivation.cultivationId()).getBody();
                    CultivationSensorListResponse sensors = response == null
                            ? new CultivationSensorListResponse(List.of(), List.of())
                            : response;
                    return new CultivationListItemView(cultivation, sensors);
                })
                .toList();

        CultivationListPageView pageView = new CultivationListPageView(
                cultivationItems,
                sensorTypes == null ? List.of() : sensorTypes.sensorTypeInfoResponses()
        );

        model.addAttribute("cultivationListPageJson", viewJsonWriter.toScriptJson(pageView));

        // 목록의 mushroomId만으로는 품종명을 알 수 없어 "버섯 #1"로 표시되던 문제 -> 기준정보를 같이 내려줌
        MushroomReferenceInfoListResponse mushrooms = sensorClient.getAllMushroomReferences().getBody();
        model.addAttribute(MUSHROOMS_JSON, viewJsonWriter.toScriptJson(
                mushrooms == null ? List.of() : mushrooms.mushroomReferenceInfoResponses()
        ));

        return "cultivation/list";
    }

    @GetMapping("/new")
    public String createForm(Model model) {
        MushroomReferenceInfoListResponse mushrooms = sensorClient.getAllMushroomReferences().getBody();
        model.addAttribute(MUSHROOMS_JSON, viewJsonWriter.toScriptJson(
                mushrooms == null ? List.of() : mushrooms.mushroomReferenceInfoResponses()
        ));
        return "cultivation/create";
    }

    @GetMapping("/mushrooms/{mushroom-id}/guide")
    public ResponseEntity<ApiResponse<MushGuideResponse>> getMushroomGuide(@PathVariable("mushroom-id") Long mushroomId) {
        return ResponseEntity.ok(aiClient.getMushroomGuide(mushroomId));
    }

    @GetMapping("/history")
    public String cultivationHistory(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size,
                                     Model model) {
        CultivationHistoryPageResponse history = cultivationClient.getHistory(page, size).getBody();

        // list()와 동일한 이유: history.content[].finishedAt(LocalDateTime)이 있으면
        // Thymeleaf JS 인라인(/*[[${history}]]*/) 직렬화 중 JSR-310 미등록 예외가 남 -> 문자열로 미리 변환.
        if (history == null) {
            history = new CultivationHistoryPageResponse(List.of(), 0, 0, 0, size);
        }

        // history 응답엔 mushroomId만 있고 품종명이 없어서, "버섯 #1"처럼 뜨는 걸 막으려고
        // 버섯 기준정보 목록(id -> 한글명)을 같이 내려줘서 프론트에서 매핑해 보여줌
        MushroomReferenceInfoListResponse mushrooms = sensorClient.getAllMushroomReferences().getBody();
        model.addAttribute(MUSHROOMS_JSON, viewJsonWriter.toScriptJson(
                mushrooms == null ? List.of() : mushrooms.mushroomReferenceInfoResponses()
        ));

        model.addAttribute("historyJson", viewJsonWriter.toJson(history));
        return "cultivation/history";
    }

    @PostMapping(
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Void> createCultivation(
            @Valid @RequestBody CultivationCreateRequest request
    ) {
        cultivationClient.createCultivation(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/{cultivation-id}")
    public String detail(@PathVariable("cultivation-id") Long cultivationId, Model model) {
        CultivationDetailResponse cultivation = cultivationClient.getDetailCultivation(cultivationId).getBody();

        MemberListResponse memberListResponse = cultivationClient.getMembers(cultivationId).getBody();
        PhotoListResponse photoListResponse = cultivationClient.getPhoto(cultivationId).getBody();
        CultivationSensorListResponse sensors = fetchSensorsOrEmpty(cultivationId);
        LatestSensorValueListResponse latestSensorValues = fetchSensorValuesOrEmpty(cultivationId);

        List<MemberResponse> members = memberListResponse == null
                ? List.of()
                : memberListResponse.memberResponses();
        List<PhotoResponse> photos = photoListResponse == null
                ? List.of()
                : photoListResponse.photoUploadResponses();

        model.addAttribute("cultivation", cultivation);
        model.addAttribute("membersJson", viewJsonWriter.toJson(members == null ? List.of() : members));
        model.addAttribute("photosJson", viewJsonWriter.toJson(photos == null ? List.of() : photos));
        model.addAttribute("sensorsJson", viewJsonWriter.toScriptJson(sensors));
        model.addAttribute("sensorValuesJson", viewJsonWriter.toScriptJson(latestSensorValues));
        model.addAttribute("myRole", cultivation != null ? cultivation.myRole() : null);

        Long growthDays = (cultivation != null && cultivation.startedAt() != null)
                ? ChronoUnit.DAYS.between(cultivation.startedAt().toLocalDate(), LocalDate.now(ZoneId.of("Asia/Seoul"))) + 1
                : null;
        model.addAttribute("growthDays", growthDays);

        // 재배 종료 후 "이전 재배와 비교" 모달에서 쓸 실제 이력 목록. 현재 재배 건은 비교 대상에서 제외.
        List<CultivationHistoryResponse> pastCultivations = List.of();
        try {
            CultivationHistoryPageResponse history = cultivationClient.getHistory(0, 20).getBody();
            if (history != null && history.content() != null) {
                pastCultivations = history.content().stream()
                        .filter(h -> !h.cultivationId().equals(cultivationId))
                        .toList();
            }
        } catch (Exception e) {
            log.warn("재배 이력 비교용 목록 조회 실패", e);
        }
        model.addAttribute("pastCultivationsJson", viewJsonWriter.toJson(pastCultivations));

        // 비교 목록에 "버섯 #1" 대신 한글 품종명을 보여주기 위한 기준정보 (history 페이지와 동일 패턴)
        MushroomReferenceInfoListResponse mushroomRefs = sensorClient.getAllMushroomReferences().getBody();
        model.addAttribute(MUSHROOMS_JSON, viewJsonWriter.toScriptJson(
                mushroomRefs == null ? List.of() : mushroomRefs.mushroomReferenceInfoResponses()
        ));

        // 사진 카드에 재배지 이름 옆으로 버섯 종류(품종명)도 같이 보여주기 위함
        String mushroomNameKo = null;
        if (cultivation != null && cultivation.mushroomId() != null && mushroomRefs != null) {
            mushroomNameKo = mushroomRefs.mushroomReferenceInfoResponses().stream()
                    .filter(m -> m.id().equals(cultivation.mushroomId()))
                    .map(m -> m.mushroomNameKo())
                    .findFirst()
                    .orElse(null);
        }
        model.addAttribute("mushroomNameKo", mushroomNameKo);

        return "dashboard/main";
    }

    @PutMapping("/{cultivation-id}/harvest-mode")
    public ResponseEntity<CultivationModeChangeResponse> switchToHarvestMode(@PathVariable("cultivation-id") Long cultivationId) {
        return cultivationClient.switchToHarvestMode(cultivationId);
    }

    @PostMapping("/{cultivation-id}/finish")
    public String finish(@PathVariable("cultivation-id") Long cultivationId) {
        cultivationClient.finishCultivation(cultivationId);
        return "redirect:/cultivations/" + cultivationId;
    }

    @DeleteMapping("/{cultivation-id}")
    public String deleteCultivationForm(@PathVariable("cultivation-id") Long cultivationId) {
        cultivationClient.deleteCultivation(cultivationId);
        return "redirect:/cultivations";
    }

    // CultivationMember
    @GetMapping("/{cultivation-id}/members")
    public ResponseEntity<MemberListResponse> getMembers(@PathVariable("cultivation-id") Long cultivationId) {
        return cultivationClient.getMembers(cultivationId);
    }

    @GetMapping("/{cultivation-id}/members/search")
    public ResponseEntity<List<UserSearchResponse>> searchMembers(@PathVariable("cultivation-id") Long cultivationId,
                                                                  @RequestParam("keyword") String keyword) {
        List<UserSearchResponse> candidates = userClient.search(keyword);
        MemberListResponse memberListResponse = cultivationClient.getMembers(cultivationId).getBody();
        Set<Long> existingMemberIds = memberListResponse == null
                ? Set.of()
                : memberListResponse.memberResponses().stream()
                .map(MemberResponse::userId)
                .collect(Collectors.toSet());

        List<UserSearchResponse> filtered = candidates.stream()
                .filter(candidate -> !existingMemberIds.contains(candidate.userId()))
                .toList();
        return ResponseEntity.ok(filtered);
    }

    @PostMapping("/{cultivation-id}/members")
    public ResponseEntity<Void> addMember(@PathVariable("cultivation-id") Long cultivationId,
                                          @RequestBody MemberAddFormRequest request) {
        cultivationClient.addMember(cultivationId, new MemberAddRequest(request.userId(), "MEMBER"));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{cultivation-id}/members/{user-id}")
    public ResponseEntity<Void> removeMember(@PathVariable("cultivation-id") Long cultivationId,
                                             @PathVariable("user-id") Long userId) {
        cultivationClient.removeMember(cultivationId, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{cultivation-id}/members/{user-id}")
    public ResponseEntity<Void> updateMember(@PathVariable("cultivation-id") Long cultivationId,
                                             @PathVariable("user-id") Long userId,
                                             @RequestBody MemberRoleUpdateRequest request) {
        cultivationClient.updateMember(cultivationId, userId, request);
        return ResponseEntity.ok().build();
    }

    // 소유권 이전
    @PutMapping("/{cultivation-id}/owner")
    public ResponseEntity<Void> transferOwnership(@PathVariable("cultivation-id") Long cultivationId,
                                                  @RequestBody OwnerTransferRequest request) {
        cultivationClient.transferOwnership(cultivationId, request);
        return ResponseEntity.ok().build();
    }

    // 수확
    @PostMapping("/{cultivation-id}/harvest")
    public ResponseEntity<HarvestCreateResponse> createHarvest(@PathVariable("cultivation-id") Long cultivationId,
                                                               @RequestBody HarvestCreateRequest request) {
        return cultivationClient.createHarvest(cultivationId, request);
    }

    // 사진
    @PostMapping("/{cultivation-id}/photos")
    public ResponseEntity<PhotoResponse> uploadPhoto(@PathVariable("cultivation-id") Long cultivationId,
                                                     @RequestParam("file") MultipartFile file) {
        return cultivationClient.uploadPhoto(cultivationId, file);
    }

    @GetMapping("{cultivation-id}/photos")
    public ResponseEntity<PhotoListResponse> getPhoto(@PathVariable("cultivation-id") Long cultivationId) {
        return cultivationClient.getPhoto(cultivationId);
    }

    @DeleteMapping("/{cultivation-id}/photos/{photo-id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable("cultivation-id") Long cultivationId,
                                            @PathVariable("photo-id") Long photoId) {
        return cultivationClient.deletePhoto(cultivationId, photoId);
    }

    // Helper Method
    private CultivationSensorListResponse fetchSensorsOrEmpty(long cultivationId) {
        try {
            CultivationSensorListResponse response = sensorClient.getSensors(cultivationId).getBody();
            return response == null ? new CultivationSensorListResponse(List.of(), List.of()) : response;
        } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
            throw e;
        } catch (FeignException e) {
            return new CultivationSensorListResponse(List.of(), List.of());
        }
    }

    private LatestSensorValueListResponse fetchSensorValuesOrEmpty(long cultivationId) {
        try {
            LatestSensorValueListResponse response = sensorClient.getLatestSensorValues(cultivationId).getBody();
            return response == null ? new LatestSensorValueListResponse(List.of()) : response;
        } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
            throw e;
        } catch (FeignException e) {
            return new LatestSensorValueListResponse(List.of());
        }
    }
}