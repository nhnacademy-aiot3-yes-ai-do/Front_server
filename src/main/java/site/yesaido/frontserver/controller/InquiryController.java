package site.yesaido.frontserver.controller;

import feign.form.FormData;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryListResponse;
import site.yesaido.frontserver.dto.inquiry.request.InquiryCreateRequest;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryCategoryResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.FileUploadValidator;
import site.yesaido.frontserver.util.LoginRequired;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@LoginRequired
@RestController
@RequestMapping("/support/inquiries")
@RequiredArgsConstructor
public class InquiryController {
    private final InquiryClient inquiryClient;
    private final CultivationClient cultivationClient;
    private final ObjectMapper objectMapper;

    @GetMapping("/categories")
    public ApiResponse<List<InquiryCategoryResponse>> getCategories() {
        return inquiryClient.getCategories();
    }

    @PostMapping
    public ApiResponse<InquiryDetailResponse> createInquiry(@RequestPart("request") InquiryCreateRequest request,
                                                            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        FileUploadValidator.validateInquiryPhotoCount(files);
        FormData requestPart = new FormData("application/json", "request.json", objectMapper.writeValueAsBytes(request));
        return inquiryClient.createInquiry(requestPart, files);
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
                                                          @RequestPart("request") InquiryMessageRequest request,
                                                          @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        FileUploadValidator.validateInquiryPhotoCount(files);
        FormData requestPart = new FormData("application/json", "request.json", objectMapper.writeValueAsBytes(request));
        return inquiryClient.addFollowUp(inquiryId, requestPart, files);
    }

    @GetMapping("/my-cultivations")
    public ApiResponse<CultivationSummaryListResponse> getMyCultivations() {
        CultivationSummaryListResponse response = cultivationClient.getCultivations().getBody();
        CultivationSummaryListResponse safeResponse = response == null
                ? new CultivationSummaryListResponse(null)
                : response;
        return new ApiResponse<>(true, "success", safeResponse);
    }
}
