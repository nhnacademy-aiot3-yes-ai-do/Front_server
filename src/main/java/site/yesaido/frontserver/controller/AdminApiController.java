package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.request.mushroom.MushroomReferenceRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.LoginRequired;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
public class AdminApiController {
    private final CultivationClient cultivationClient;
    private final InquiryClient inquiryClient;

    @GetMapping("/admin/inquiries/list")
    public ApiResponse<InquirySummaryPageResponse> getAllInquiries(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return inquiryClient.getAllInquiries(status, page, size);
    }

    @GetMapping("/admin/inquiries/{inquiry-id}")
    public ApiResponse<InquiryDetailResponse> getInquiryDetail(@PathVariable("inquiry-id") Long inquiryId) {
        return inquiryClient.getInquiryDetailForAdmin(inquiryId);
    }

    @PutMapping("/admin/inquiries/messages/{answer-id}")
    public ApiResponse<InquiryDetailResponse> answerMessage(@PathVariable("answer-id") Long answerId,
                                                            @RequestBody InquiryMessageRequest request) {
        return inquiryClient.answerMessage(answerId, request);
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