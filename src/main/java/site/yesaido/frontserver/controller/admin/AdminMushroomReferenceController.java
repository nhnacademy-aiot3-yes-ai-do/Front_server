package site.yesaido.frontserver.controller.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.request.mushroom.MushroomReferenceRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.UpstreamResponseUtils;

@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/mushroom-references")
public class AdminMushroomReferenceController {
    private final SensorClient sensorClient;

    @GetMapping
    public ResponseEntity<MushroomReferenceInfoListResponse> getMushroomReferences() {
        return UpstreamResponseUtils.isolate(sensorClient.getAllMushroomReferencesByAdmin());
    }

    @PostMapping
    public ResponseEntity<Void> createMushroomReference(@Valid @RequestBody MushroomReferenceRequest request) {
        return UpstreamResponseUtils.isolateWithLocation(sensorClient.registerMushroomReference(request));
    }

    @PutMapping("{mushroom-reference-id}")
    public ResponseEntity<Void> updateMushroomReference(@PathVariable("mushroom-reference-id") Long id,
                                                        @Valid @RequestBody MushroomReferenceRequest request) {
        return UpstreamResponseUtils.isolate(sensorClient.updateMushroomReference(id, request));
    }

    @DeleteMapping("/{mushroom-reference-id}")
    public String deleteMushroomReferenceForm(@PathVariable("mushroom-reference-id") Long id) {
        sensorClient.deleteMushroomReference(id);
        return "redirect:/admin/mushrooms";
    }

}
