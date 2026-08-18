package site.yesaido.frontserver.client;

import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.dto.cultivation.request.mushroom.MushroomReferenceRequest;
import site.yesaido.frontserver.dto.cultivation.request.sensor.CreateCultivationSensorRequest;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorTypeRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoResponse;

@FeignClient(name = "sensor-client", url = "${feign.client.gateway.url}")
public interface SensorClient {
    // sensor type
    @GetMapping("/api/v1/sensor-types")
    ResponseEntity<SensorTypeInfoListResponse> getSensorTypes();

    @PostMapping("/api/v1/admin/sensor-types")
    ResponseEntity<Void> registerSensorType(@Valid @RequestBody SensorTypeRequest request);

    @PutMapping("/api/v1/admin/sensor-types/{sensor-type-id}")
    ResponseEntity<Void> updateSensorType(@PathVariable("sensor-type-id")Long id,
                                          @Valid @RequestBody SensorTypeRequest request);

    @DeleteMapping("/api/v1/admin/sensor-types/{sensor-type-id}")
    ResponseEntity<Void> deleteSensorType(@PathVariable("sensor-type-id")Long id);

    @GetMapping("/api/v1/admin/sensor-types/{sensor-type-id}")
    ResponseEntity<SensorTypeInfoResponse> getSensorType(@PathVariable("sensor-type-id")Long id);

    // mushroom reference (관리자)
    @PostMapping("/api/v1/admin/mushroom-references")
    ResponseEntity<Void> registerMushroomReference(@RequestBody MushroomReferenceRequest request);

    @PutMapping("/api/v1/admin/mushroom-references/{mushroom-reference-id}")
    ResponseEntity<Void> updateMushroomReference(@PathVariable("mushroom-reference-id") Long id,
                                                 @RequestBody MushroomReferenceRequest request);

    @DeleteMapping("/api/v1/admin/mushroom-references/{mushroom-reference-id}")
    ResponseEntity<Void> deleteMushroomReference(@PathVariable("mushroom-reference-id") Long id);

    @GetMapping("/api/v1/admin/mushroom-references")
    ResponseEntity<MushroomReferenceInfoListResponse> getAllMushroomReferencesByAdmin();

    @GetMapping("/api/v1/mushroom-references")
    ResponseEntity<MushroomReferenceInfoListResponse> getAllMushroomReferences();

    // cultivation sensor
    @PostMapping("/api/v1/cultivations/{cultivation-id}/sensors")
    ResponseEntity<Void> registerSensor(@PathVariable("cultivation-id") long cultivationId,
                                        @Valid @RequestBody CreateCultivationSensorRequest request);

    @DeleteMapping("/api/v1/cultivations/{cultivation-id}/sensors/{sensor-id}")
    ResponseEntity<Void> deleteSensor(@PathVariable("cultivation-id") long cultivationId,
                                      @PathVariable("sensor-id") long sensorId);

    @GetMapping("/api/v1/cultivations/{cultivation-id}/sensors")
    ResponseEntity<CultivationSensorListResponse> getSensors(@PathVariable("cultivation-id") long cultivationId);

    // 실시간 센서값
    @GetMapping("/api/v1/cultivations/{cultivation-id}/sensor-values")
    ResponseEntity<LatestSensorValueListResponse> getLatestSensorValues(@PathVariable("cultivation-id") Long cultivationId);
}
