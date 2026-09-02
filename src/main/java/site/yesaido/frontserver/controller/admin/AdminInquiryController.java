package site.yesaido.frontserver.controller.admin;

import feign.form.FormData;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryDetailResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.FileUploadValidator;
import site.yesaido.frontserver.util.LoginRequired;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@RestController
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
@RequestMapping("/admin/inquiries")
public class AdminInquiryController {
    private final InquiryClient inquiryClient;
    private final ObjectMapper objectMapper;

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

    @PutMapping(value = "/messages/{answer-id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<InquiryDetailResponse> answerMessage(@PathVariable("answer-id") Long answerId,
                                                            @RequestPart("request") InquiryMessageRequest request,
                                                            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        FileUploadValidator.validateInquiryPhotoCount(files);
        FormData requestPart = new FormData("application/json", "request.json", objectMapper.writeValueAsBytes(request));
        return inquiryClient.answerMessage(answerId, requestPart, files);
    }
}