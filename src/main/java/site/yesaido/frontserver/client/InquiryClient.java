package site.yesaido.frontserver.client;

import feign.form.FormData;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryCategoryResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;

import java.util.List;

@FeignClient(name = "inquiryClient", url = "${feign.client.gateway.url}")
public interface InquiryClient {

    // 사용자용
    @GetMapping("/api/v1/inquiries/categories")
    ApiResponse<List<InquiryCategoryResponse>> getCategories();

    @PostMapping(value = "/api/v1/inquiries", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<InquiryDetailResponse> createInquiry(@RequestPart("request") FormData request,
                                                     @RequestPart(value = "files", required = false) List<MultipartFile> files);

    @GetMapping("/api/v1/inquiries")
    ApiResponse<InquirySummaryPageResponse> getMyInquiries(@RequestParam("page") int page,
                                                           @RequestParam("size") int size);

    @GetMapping("/api/v1/inquiries/{inquiry-id}")
    ApiResponse<InquiryDetailResponse> getMyInquiryDetail(@PathVariable("inquiry-id") Long inquiryId);

    @PostMapping("/api/v1/inquiries/{inquiry-id}/messages")
    ApiResponse<InquiryDetailResponse> addFollowUp(@PathVariable("inquiry-id") Long inquiryId,
                                                   @RequestBody InquiryMessageRequest request);

    // 관리자용
    @GetMapping("/api/v1/admin/inquiries")
    ApiResponse<InquirySummaryPageResponse> getAllInquiries(@RequestParam(value = "status", required = false) InquiryStatus status,
                                                            @RequestParam("page") int page,
                                                            @RequestParam("size") int size);

    @GetMapping("/api/v1/admin/inquiries/{inquiry-id}")
    ApiResponse<InquiryDetailResponse> getInquiryDetailForAdmin(@PathVariable("inquiry-id") Long inquiryId);

    @PutMapping("/api/v1/admin/inquiries/messages/{answer-id}")
    ApiResponse<InquiryDetailResponse> answerMessage(@PathVariable("answer-id") Long answerId,
                                                     @RequestBody InquiryMessageRequest request);

}
