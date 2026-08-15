package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.dto.cultivation.request.mushroom.MushroomReferenceRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
public class AdminController {
    private final CultivationClient cultivationClient;

    @GetMapping("/admin")
    public String admin() {
        return "admin/index";
    }

    @GetMapping("/admin/members")
    public String members() {
        return "admin/members";
    }

    @GetMapping("/admin/inquiries")
    public String inquiries() {
        return "admin/inquiries";
    }

    @GetMapping("/admin/mushrooms")
    public String mushrooms() {
        return "admin/mushrooms";
    }

    @GetMapping("/admin/mushroom-references")
    public ResponseEntity<MushroomReferenceInfoListResponse> getMushroomReferences() {
        return cultivationClient.getAllMushroomReferences();
    }

    @PostMapping("/admin/mushroom-references")
    public ResponseEntity<Void> createMushroomReference(@RequestBody MushroomReferenceRequest request) {
        return cultivationClient.registerMushroomReference(request);
    }

    @PutMapping("/admin/mushroom-references/{mushroom-reference-id}")
    public ResponseEntity<Void> updateMushroomReference(@PathVariable("mushroom-reference-id") Long id,
                                                        @RequestBody MushroomReferenceRequest request) {
        return cultivationClient.updateMushroomReference(id, request);
    }

    @DeleteMapping("/admin/mushroom-references/{mushroom-reference-id}")
    public ResponseEntity<Void> deleteMushroomReference(@PathVariable("mushroom-reference-id") Long id) {
        return cultivationClient.deleteMushroomReference(id);
    }

    @GetMapping("/admin/sensor-types")
    public ResponseEntity<SensorTypeInfoListResponse> getSensorTypes() {
        return cultivationClient.getSensorTypes();
    }
}
