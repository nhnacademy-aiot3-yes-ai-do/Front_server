package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;

@FeignClient(name = "aiClient", url = "${feign.client.gateway.url}")
public interface AiClient {


    @GetMapping("/api/mushrooms/{mushroom-id}/guide")
    ApiResponse<MushGuideResponse> getMushroomGuide(@PathVariable("mushroom-id") Long mushroomId);
}
