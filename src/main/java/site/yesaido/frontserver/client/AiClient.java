package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.MushGuideResponse;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorValidationRequest;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorValidationResponse;

@FeignClient(name = "aiClient", url = "${feign.client.gateway.url}")
public interface AiClient {


    @GetMapping("/api/mushrooms/{mushroom-id}/guide")
    ApiResponse<MushGuideResponse> getMushroomGuide(@PathVariable("mushroom-id") Long mushroomId);

    @PostMapping("/api/ai/sensor-validation")
    ApiResponse<SensorValidationResponse> validationSensorThreshold(@RequestBody SensorValidationRequest request);
}
