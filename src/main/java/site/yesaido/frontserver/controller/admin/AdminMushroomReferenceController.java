package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.request.mushroom.MushroomReferenceRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/mushroom-references")
public class AdminMushroomReferenceController {
    private final SensorClient sensorClient;

    @GetMapping
    public ResponseEntity<MushroomReferenceInfoListResponse> getMushroomReferences() {
        return sensorClient.getAllMushroomReferencesByAdmin();
    }

    @PostMapping
    public ResponseEntity<Void> createMushroomReference(@RequestBody MushroomReferenceRequest request) {
        return sensorClient.registerMushroomReference(request);
    }

    @PutMapping("{mushroom-reference-id}")
    public ResponseEntity<Void> updateMushroomReference(@PathVariable("mushroom-reference-id") Long id,
                                                        @RequestBody MushroomReferenceRequest request) {
        return sensorClient.updateMushroomReference(id, request);
    }

    @DeleteMapping("/{mushroom-reference-id}")
    public String deleteMushroomReferenceForm(@PathVariable("mushroom-reference-id") Long id) {
        sensorClient.deleteMushroomReference(id);
        return "redirect:/admin/mushrooms";
    }

}
