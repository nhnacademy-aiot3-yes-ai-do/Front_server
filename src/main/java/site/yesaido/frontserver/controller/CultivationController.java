package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
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
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class CultivationController {

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
        return "cultivation/list";
    }

    @GetMapping("/new")
    public String createForm(Model model) {
        MushroomReferenceInfoListResponse mushrooms = sensorClient.getAllMushroomReferences().getBody();
        model.addAttribute("mushroomsJson", viewJsonWriter.toScriptJson(
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

        model.addAttribute("historyJson", viewJsonWriter.toJson(history));
        return "cultivation/history";
    }
  
    @PostMapping
    public String createCultivation(@RequestParam String name, @RequestParam Long mushroomId) {
        cultivationClient.createCultivation(new CultivationCreateRequest(name, mushroomId));
        return "redirect:/cultivations";
    }

    @GetMapping("/{cultivation-id}")
    public String detail(@PathVariable("cultivation-id") Long cultivationId, Model model) {

        // cultivationClient 3번 요청을 하는데, 하나의 meta data로 dto로 묶어서 받을 수 있게 나중에 리팩토링
        CultivationDetailResponse cultivation = cultivationClient.getDetailCultivation(cultivationId).getBody();

        MemberListResponse memberListResponse = cultivationClient.getMembers(cultivationId).getBody();
        PhotoListResponse photoListResponse = cultivationClient.getPhoto(cultivationId).getBody();

        List<MemberResponse> members = memberListResponse == null
                ? List.of()
                : memberListResponse.memberResponses();
        List<PhotoResponse> photos = photoListResponse == null
                ? List.of()
                : photoListResponse.photoUploadResponses();

        // dashboard/main.html도 members/photos를 th:inline="javascript"로 통째로 직렬화함.
        // MemberResponse.joinedAt / PhotoResponse.updatedAt이 LocalDateTime이라 위와 같은 이유로 문자열 변환 필요.
        model.addAttribute("cultivation", cultivation);
        model.addAttribute("membersJson", viewJsonWriter.toJson(members == null ? List.of() : members));
        model.addAttribute("photosJson", viewJsonWriter.toJson(photos == null ? List.of() : photos));
        model.addAttribute("myRole", cultivation != null ? cultivation.myRole() : null);

        // 재배 현황 카드의 "생육 일수" 표시용 (시작일부터 오늘까지, 시작일을 1일차로 계산)
        Long growthDays = (cultivation != null && cultivation.startedAt() != null)
                ? ChronoUnit.DAYS.between(cultivation.startedAt().toLocalDate(), LocalDate.now()) + 1
                : null;
        model.addAttribute("growthDays", growthDays);

        return "dashboard/main";
    }

    @PostMapping("/{cultivation-id}/finish")
    public String finish(@PathVariable("cultivation-id") Long cultivationId) {
        cultivationClient.finishCultivation(cultivationId);
        return "redirect:/cultivations/" + cultivationId;
    }

    @DeleteMapping("/{cultivation-id}")
    public ResponseEntity<Void> deleteCultivation(@PathVariable("cultivation-id") Long cultivationId) {
        cultivationClient.deleteCultivation(cultivationId);
        return ResponseEntity.noContent().build();
    }

    // CultivationMember
    @GetMapping("/{cultivation-id}/members")
    public ResponseEntity<MemberListResponse> getMembers(@PathVariable("cultivation-id") Long cultivationId) {
        return cultivationClient.getMembers(cultivationId);
    }

    @GetMapping("/{cultivation-id}/members/search")
    public ResponseEntity<List<UserSearchResponse>> searchMembers(@PathVariable("cultivation-id") Long cultivationId,
                                                                  @RequestParam("keyword") String keyword) {
        return ResponseEntity.ok(userClient.search(keyword));
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
}