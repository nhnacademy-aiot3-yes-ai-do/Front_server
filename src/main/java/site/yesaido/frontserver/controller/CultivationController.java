package site.yesaido.frontserver.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;
import site.yesaido.frontserver.dto.cultivation.request.cultivation.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddFormRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberRoleUpdateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.OwnerTransferRequest;
import site.yesaido.frontserver.dto.cultivation.request.harvest.HarvestCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationModeChangeResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.PhotoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.UserSearchResponse;
import site.yesaido.frontserver.dto.cultivation.response.harvest.HarvestCreateResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class CultivationController {
    private static final String REACT_APP = "forward:/react/index.html";

    private final CultivationClient cultivationClient;
    private final UserClient userClient;
    private final AiClient aiClient;

    @GetMapping
    public String list() {
        return REACT_APP;
    }

    @GetMapping("/new")
    public String createForm() {
        return REACT_APP;
    }

    @GetMapping("/mushrooms/{mushroom-id}/guide")
    public ResponseEntity<ApiResponse<MushGuideResponse>> getMushroomGuide(@PathVariable("mushroom-id") Long mushroomId) {
        return ResponseEntity.ok(aiClient.getMushroomGuide(mushroomId));
    }

    @GetMapping("/history")
    public String cultivationHistory() {
        return REACT_APP;
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
    public String detail(@PathVariable("cultivation-id") Long cultivationId) {
        return REACT_APP;
    }

    @PutMapping("/{cultivation-id}/harvest-mode")
    public ResponseEntity<CultivationModeChangeResponse> switchToHarvestMode(@PathVariable("cultivation-id") Long cultivationId) {
        ResponseEntity<CultivationModeChangeResponse> response = cultivationClient.switchToHarvestMode(cultivationId);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
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
    public String uploadPhoto(@PathVariable("cultivation-id") Long cultivationId,
                                                     @RequestParam("file") MultipartFile file) {
        cultivationClient.uploadPhoto(cultivationId, file);
        return "redirect:/cultivations/" + cultivationId;
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
