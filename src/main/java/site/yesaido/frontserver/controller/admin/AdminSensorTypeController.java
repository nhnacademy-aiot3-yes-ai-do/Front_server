package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.request.sensor.SensorTypeRequest;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/sensor-types")
public class AdminSensorTypeController {
    private final SensorClient sensorClient;

    private static final String REDIRECT_ADMIN_SENSORS = "redirect:/admin/sensors";

    @GetMapping
    public ResponseEntity<SensorTypeInfoListResponse> getSensorTypes() {
        return UpstreamResponseUtils.isolate(sensorClient.getSensorTypes());
    }

    @PostMapping
    public String createSensorTypeForm(@RequestParam String type, @RequestParam String valueUnit) {
        sensorClient.registerSensorType(new SensorTypeRequest(type, valueUnit));
        return REDIRECT_ADMIN_SENSORS;
    }

    @PutMapping("/{sensor-type-id}")
    public String updateSensorTypeForm(@PathVariable("sensor-type-id") Long id,
                                       @RequestParam String type,
                                       @RequestParam String valueUnit) {
        sensorClient.updateSensorType(id, new SensorTypeRequest(type, valueUnit));
        return REDIRECT_ADMIN_SENSORS;
    }

    @DeleteMapping("/{sensor-type-id}")
    public String deleteSensorTypeForm(@PathVariable("sensor-type-id") Long id) {
        sensorClient.deleteSensorType(id);
        return REDIRECT_ADMIN_SENSORS;
    }

}
