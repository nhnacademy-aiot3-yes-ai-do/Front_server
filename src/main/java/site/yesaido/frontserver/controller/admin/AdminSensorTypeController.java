package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorTypeRequest;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/sensor-types")
public class AdminSensorTypeController {
    private final SensorClient sensorClient;

    @GetMapping
    public ResponseEntity<SensorTypeInfoListResponse> getSensorTypes() {
        return sensorClient.getSensorTypes();
    }

    @PostMapping
    public ResponseEntity<Void> createSensorType(@RequestBody SensorTypeRequest request) {
        return sensorClient.registerSensorType(request);
    }

    @PutMapping("/{sensor-type-id}")
    public ResponseEntity<Void> updateSensorType(@PathVariable("sensor-type-id") Long id,
                                                 @RequestBody SensorTypeRequest request) {
        return sensorClient.updateSensorType(id, request);
    }

    @DeleteMapping("/{sensor-type-id}")
    public ResponseEntity<Void> deleteSensorType(@PathVariable("sensor-type-id") Long id) {
        return sensorClient.deleteSensorType(id);
    }
}
