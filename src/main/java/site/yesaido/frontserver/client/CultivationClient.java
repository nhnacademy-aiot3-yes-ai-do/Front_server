package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.cultivation.request.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.CultivationCreateResponse;
import site.yesaido.frontserver.dto.cultivation.response.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.CultivationFinishResponse;
import site.yesaido.frontserver.dto.cultivation.response.CultivationSummaryResponse;

import java.util.List;

@FeignClient(name = "cultivationClient", url = "${feign.client.gateway.url}")
public interface CultivationClient {

    @PostMapping("/api/cultivations")
    ResponseEntity<CultivationCreateResponse> createCultivation(@RequestBody CultivationCreateRequest request);

    @GetMapping("/api/cultivations")
    ResponseEntity<List<CultivationSummaryResponse>> getCultivations();

    @GetMapping("/api/cultivations/{cultivation-id}")
    ResponseEntity<CultivationDetailResponse> getDetailCultivation(@PathVariable("cultivation-id") Long cultivationId);

    @PutMapping("/api/cultivations/{cultivation-id}/finish")
    ResponseEntity<CultivationFinishResponse> finishCultivation(@PathVariable("cultivation-id") Long cultivationId);


}
