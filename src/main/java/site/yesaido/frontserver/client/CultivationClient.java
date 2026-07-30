package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.cultivation.request.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.request.MemberAddRequest;
import site.yesaido.frontserver.dto.cultivation.response.*;

import java.util.List;

@FeignClient(name = "cultivationClient", url = "${feign.client.gateway.url}")
public interface CultivationClient {
    // Cultivation
    @PostMapping("/api/cultivations")
    ResponseEntity<CultivationCreateResponse> createCultivation(@RequestBody CultivationCreateRequest request);

    @GetMapping("/api/cultivations")
    ResponseEntity<List<CultivationSummaryResponse>> getCultivations();

    @GetMapping("/api/cultivations/{cultivation-id}")
    ResponseEntity<CultivationDetailResponse> getDetailCultivation(@PathVariable("cultivation-id") Long cultivationId);

    @PutMapping("/api/cultivations/{cultivation-id}/finish")
    ResponseEntity<CultivationFinishResponse> finishCultivation(@PathVariable("cultivation-id") Long cultivationId);

    @GetMapping("/api/cultivations/history")
    ResponseEntity<CultivationHistoryResponse> getHistory(@RequestParam("page") int page, @RequestParam("size") int size);

    // CultivationMember
    @PostMapping("/api/cultivations/{cultivation-id}/members")
    ResponseEntity<Void> addMember(@PathVariable("cultivation-id") Long cultivationId,
                                   @RequestBody MemberAddRequest request);

    @GetMapping("/api/cultivations/{cultivation-id}/members")
    ResponseEntity<List<MemberResponse>> getMembers(@PathVariable("cultivation-id") Long cultivationId);

    @DeleteMapping("/api/cultivations/{cultivation-id}/members/{user-id}")
    ResponseEntity<Void> removeMember(@PathVariable("cultivation-id") Long cultivationId, @PathVariable("user-id") Long userId);
}
