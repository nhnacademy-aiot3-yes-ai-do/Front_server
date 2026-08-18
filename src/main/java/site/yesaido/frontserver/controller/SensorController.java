package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.request.sensor.CreateCultivationSensorRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.LatestSensorValueListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;

@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class SensorController {
    private final SensorClient sensorClient;

    @GetMapping("/mushroom-references")
    public ResponseEntity<MushroomReferenceInfoListResponse> getMushroomReferences() {
        return sensorClient.getAllMushroomReferences();
    }

    @GetMapping("/sensor-types")
    public ResponseEntity<SensorTypeInfoListResponse> getSensorTypes() {
        return sensorClient.getSensorTypes();
    }

    @GetMapping("/{cultivation-id}/sensors")
    public ResponseEntity<CultivationSensorListResponse> getSensors(@PathVariable("cultivation-id") Long cultivationId) {
        return sensorClient.getSensors(cultivationId);
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

    @GetMapping("/{cultivation-id}/sensor-values")
    public ResponseEntity<LatestSensorValueListResponse> getLatestSensorValues(@PathVariable("cultivation-id") Long cultivationId) {
        return sensorClient.getLatestSensorValues(cultivationId);
    }
}
