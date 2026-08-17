package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.request.InquiryCreateRequest;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryCategoryResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;

import java.util.List;

@FeignClient(name = "inquiryClient", url = "${feign.client.gateway.url}")
public interface InquiryClient {

    // 사용자용
    @GetMapping("/api/inquiries/categories")
    ApiResponse<List<InquiryCategoryResponse>> getCategories();

    @PostMapping("/api/inquiries")
    ApiResponse<InquiryDetailResponse> createInquiry(@RequestBody InquiryCreateRequest request);

    @GetMapping("/api/inquiries")
    ApiResponse<InquirySummaryPageResponse> getMyInquiries(@RequestParam("page") int page,
                                                           @RequestParam("size") int size);

    @GetMapping("/api/inquiries/{inquiry-id}")
    ApiResponse<InquiryDetailResponse> getMyInquiryDetail(@PathVariable("inquiry-id") Long inquiryId);

    @PostMapping("/api/inquiries/{inquiry-id}/messages")
    ApiResponse<InquiryDetailResponse> addFollowUp(@PathVariable("inquiry-id") Long inquiryId,
                                                   @RequestBody InquiryMessageRequest request);

    // 관리자용
    @GetMapping("/api/admin/inquiries")
    ApiResponse<InquirySummaryPageResponse> getAllInquiries(@RequestParam(value = "status", required = false) InquiryStatus status,
                                                            @RequestParam("page") int page,
                                                            @RequestParam("size") int size);

    @GetMapping("/api/admin/inquiries/{inquiry-id}")
    ApiResponse<InquiryDetailResponse> getInquiryDetailForAdmin(@PathVariable("inquiry-id") Long inquiryId);

    @PutMapping("/api/admin/inquiries/messages/{answer-id}")
    ApiResponse<InquiryDetailResponse> answerMessage(@PathVariable("answer-id") Long answerId,
                                                     @RequestBody InquiryMessageRequest request);

}
