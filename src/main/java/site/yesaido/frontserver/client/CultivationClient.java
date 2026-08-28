package site.yesaido.frontserver.client;

import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.dto.cultivation.request.cultivation.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberRoleUpdateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.OwnerTransferRequest;
import site.yesaido.frontserver.dto.cultivation.request.harvest.HarvestCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.*;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.harvest.HarvestCreateResponse;

@FeignClient(name = "cultivationClient", url = "${feign.client.gateway.url}")
public interface CultivationClient {
    // Cultivation
    @PostMapping("/api/v1/cultivations")
    ResponseEntity<CultivationCreateResponse> createCultivation(@RequestBody CultivationCreateRequest request);

    @GetMapping("/api/v1/cultivations")
    ResponseEntity<CultivationSummaryListResponse> getCultivations();

    @GetMapping("/api/v1/cultivations/{cultivation-id}")
    ResponseEntity<CultivationDetailResponse> getDetailCultivation(@PathVariable("cultivation-id") Long cultivationId);

    @PutMapping("/api/v1/cultivations/{cultivation-id}/finish")
    ResponseEntity<CultivationFinishResponse> finishCultivation(@PathVariable("cultivation-id") Long cultivationId);

    @DeleteMapping("/api/v1/cultivations/{cultivation-id}")
    ResponseEntity<Void> deleteCultivation(@PathVariable("cultivation-id") Long cultivationId);


    @GetMapping("/api/v1/cultivations/history")
    ResponseEntity<CultivationHistoryPageResponse> getHistory(@RequestParam("page") int page, @RequestParam("size") int size);

    // CultivationMember
    @PostMapping("/api/v1/cultivations/{cultivation-id}/members")
    ResponseEntity<Void> addMember(@PathVariable("cultivation-id") Long cultivationId,
                                   @RequestBody MemberAddRequest request);

    @GetMapping("/api/v1/cultivations/{cultivation-id}/members")
    ResponseEntity<MemberListResponse> getMembers(@PathVariable("cultivation-id") Long cultivationId);

    @DeleteMapping("/api/v1/cultivations/{cultivation-id}/members/{user-id}")
    ResponseEntity<Void> removeMember(@PathVariable("cultivation-id") Long cultivationId, @PathVariable("user-id") Long userId);

    @PutMapping("/api/v1/cultivations/{cultivation-id}/members/{user-id}")
    ResponseEntity<Void> updateMember(@PathVariable("cultivation-id") Long cultivationId,
                                      @PathVariable("user-id") Long userId,
                                      @RequestBody MemberRoleUpdateRequest request);

    // 소유권 이전
    @PutMapping("/api/v1/cultivations/{cultivation-id}/owner")
    ResponseEntity<Void> transferOwnership(@PathVariable("cultivation-id") Long cultivationId,
                                           @RequestBody OwnerTransferRequest request);

    // 수확
    @PostMapping("/api/v1/cultivations/{cultivation-id}/harvest")
    ResponseEntity<HarvestCreateResponse> createHarvest(@PathVariable("cultivation-id") Long cultivationId,
                                                        @Valid @RequestBody HarvestCreateRequest request);

    // 사진
    @PostMapping(value = "/api/v1/cultivations/{cultivation-id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<PhotoResponse> uploadPhoto(@PathVariable("cultivation-id") Long cultivationId, @RequestPart("file") MultipartFile file);

    @GetMapping("/api/v1/cultivations/{cultivation-id}/photos")
    ResponseEntity<PhotoListResponse> getPhoto(@PathVariable("cultivation-id") Long cultivationId);

    @DeleteMapping("/api/v1/cultivations/{cultivation-id}/photos/{photo-id}")
    ResponseEntity<Void> deletePhoto(@PathVariable("cultivation-id") Long cultivationId,
                                     @PathVariable("photo-id") Long photoId);

    // 모드 변경
    @PutMapping("/api/v1/cultivations/{cultivation-id}/harvest-mode")
    ResponseEntity<CultivationModeChangeResponse> switchToHarvestMode(@PathVariable("cultivation-id") Long cultivationId);
}
