package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.request.sensor.CreateCultivationSensorRequest;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorValidationRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.*;
import site.yesaido.frontserver.util.LoginRequired;

@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class SensorController {
    private final SensorClient sensorClient;
    private final AiClient aiClient;

    @GetMapping(value = "/mushroom-references", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<MushroomReferenceInfoListResponse> getMushroomReferences() {
        ResponseEntity<MushroomReferenceInfoListResponse> upstream = sensorClient.getAllMushroomReferences();
        return jsonResponse(upstream);
    }

    @GetMapping(value = "/sensor-types", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SensorTypeInfoListResponse> getSensorTypes() {
        ResponseEntity<SensorTypeInfoListResponse> upstream = sensorClient.getSensorTypes();
        return jsonResponse(upstream);
    }

    @GetMapping(value = "/{cultivation-id}/sensors", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CultivationSensorListResponse> getSensors(@PathVariable("cultivation-id") Long cultivationId) {
        ResponseEntity<CultivationSensorListResponse> upstream = sensorClient.getSensors(cultivationId);
        return jsonResponse(upstream);
    }

    @PostMapping("/{cultivation-id}/sensors")
    public ResponseEntity<Void> registerSensor(@PathVariable("cultivation-id") Long cultivationId,
                                               @RequestBody CreateCultivationSensorRequest request) {
        return sensorClient.registerSensor(cultivationId, request);
    }

    @DeleteMapping("/{cultivation-id}/sensors/{sensor-id}")
    public ResponseEntity<Void> deleteSensor(@PathVariable("cultivation-id") Long cultivationId,
                                             @PathVariable("sensor-id") Long sensorId) {
        return sensorClient.deleteSensor(cultivationId, sensorId);
    }

    @GetMapping(value = "/{cultivation-id}/sensor-values", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LatestSensorValueListResponse> getLatestSensorValues(@PathVariable("cultivation-id") Long cultivationId) {
        ResponseEntity<LatestSensorValueListResponse> upstream = sensorClient.getLatestSensorValues(cultivationId);
        return jsonResponse(upstream);
    }

    @GetMapping(value = "/{cultivation-id}/sensor-values/trend", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SensorTrendPointListResponse> getSensorTrend(@PathVariable("cultivation-id") Long cultivationId,
                                                                       @RequestParam("device-eui") String deviceEui,
                                                                       @RequestParam("sensor-type") String sensorType) {
        ResponseEntity<SensorTrendPointListResponse> upstream = sensorClient.getSensorTrend(cultivationId, deviceEui, sensorType);
        return jsonResponse(upstream);
    }

    @PostMapping("/{cultivation-id}/sensor-validation")
    public ResponseEntity<ApiResponse<SensorValidationResponse>> validationSensorThreshold(
            @PathVariable("cultivation-id") Long cultivationId,
            @RequestBody SensorValidationRequest request){
        return ResponseEntity.ok(aiClient.validationSensorThreshold(cultivationId ,request));
    }

    /**
     * Sensor data is JSON only; content type and nosniff prevent HTML execution.
     */
    private <T> ResponseEntity<T> jsonResponse(ResponseEntity<T> upstream) {
        //noinspection UncontrolledDataFlow
        return ResponseEntity.status(upstream.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Content-Type-Options", "nosniff")
                .body(upstream.getBody());
    }
}
