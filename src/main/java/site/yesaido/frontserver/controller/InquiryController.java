package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.inquiry.request.InquiryCreateRequest;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryCategoryResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@LoginRequired
@RestController
@RequestMapping("/support/inquiries")
@RequiredArgsConstructor
public class InquiryController {
    private final InquiryClient inquiryClient;
    private final CultivationClient cultivationClient;

    @GetMapping("/categories")
    public ApiResponse<List<InquiryCategoryResponse>> getCategories() {
        return inquiryClient.getCategories();
    }

    @PostMapping
    public ApiResponse<InquiryDetailResponse> createInquiry(@RequestBody InquiryCreateRequest request) {
        return inquiryClient.createInquiry(request);
    }

    @GetMapping
    public ApiResponse<InquirySummaryPageResponse> getMyInquiries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return inquiryClient.getMyInquiries(page, size);
    }

    @GetMapping("/{inquiry-id}")
    public ApiResponse<InquiryDetailResponse> getMyInquiryDetail(@PathVariable("inquiry-id") Long inquiryId) {
        return inquiryClient.getMyInquiryDetail(inquiryId);
    }

    @PostMapping("/{inquiry-id}/messages")
    public ApiResponse<InquiryDetailResponse> addFollowUp(@PathVariable("inquiry-id") Long inquiryId,
                                                          @RequestBody InquiryMessageRequest request) {
        return inquiryClient.addFollowUp(inquiryId, request);
    }

    @GetMapping("/my-cultivations")
    public ApiResponse<CultivationSummaryListResponse> getMyCultivations() {
        CultivationSummaryListResponse response = cultivationClient.getCultivations().getBody();
        return new ApiResponse<>(true, "success", response);
    }
}
