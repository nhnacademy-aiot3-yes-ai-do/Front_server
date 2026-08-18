package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.client.SensorClient;
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
}
