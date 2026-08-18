package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.LoginRequired;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/inquiries")
public class AdminInquiryController {
    private final InquiryClient inquiryClient;

    @GetMapping("/list")
    public ApiResponse<InquirySummaryPageResponse> getAllInquiries(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return inquiryClient.getAllInquiries(status, page, size);
    }

    @GetMapping("/{inquiry-id}")
    public ApiResponse<InquiryDetailResponse> getInquiryDetail(@PathVariable("inquiry-id") Long inquiryId) {
        return inquiryClient.getInquiryDetailForAdmin(inquiryId);
    }

    @PutMapping("/messages/{answer-id}")
    public ApiResponse<InquiryDetailResponse> answerMessage(@PathVariable("answer-id") Long answerId,
                                                            @RequestBody InquiryMessageRequest request) {
        return inquiryClient.answerMessage(answerId, request);
    }
}
