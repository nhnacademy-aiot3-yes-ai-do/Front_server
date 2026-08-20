package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@Slf4j
@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
public class AdminViewController {

    private static final int DASHBOARD_INQUIRY_PREVIEW_SIZE = 4;

    private final InquiryClient inquiryClient;
    private final CultivationClient cultivationClient;

    @GetMapping("/admin")
    public String admin(Model model) {
        List<InquirySummaryResponse> pendingInquiries = List.of();
        long pendingInquiryCount = 0;
        try {
            ApiResponse<InquirySummaryPageResponse> response =
                    inquiryClient.getAllInquiries(InquiryStatus.PENDING, 0, DASHBOARD_INQUIRY_PREVIEW_SIZE);
            InquirySummaryPageResponse page = response != null ? response.data() : null;
            if (page != null) {
                pendingInquiries = page.content() != null ? page.content() : List.of();
                pendingInquiryCount = page.totalElements() != null ? page.totalElements() : 0;
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 미답변 문의 조회 실패", e);
        }

        int mushroomCount = 0;
        try {
            MushroomReferenceInfoListResponse mushroomReferences = cultivationClient.getAllMushroomReferences().getBody();
            if (mushroomReferences != null && mushroomReferences.mushroomReferenceInfoResponses() != null) {
                mushroomCount = mushroomReferences.mushroomReferenceInfoResponses().size();
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 버섯 종류 조회 실패", e);
        }

        model.addAttribute("pendingInquiries", pendingInquiries);
        model.addAttribute("pendingInquiryCount", pendingInquiryCount);
        model.addAttribute("mushroomCount", mushroomCount);

        return "admin/index";
    }

    @GetMapping("/admin/members")
    public String members() {
        return "admin/members";
    }

    // 문의사항 용
    @GetMapping("/admin/inquiries")
    public String inquiries() {
        return "admin/inquiries";
    }

    // 버섯 등록
    @GetMapping("/admin/mushrooms")
    public String mushrooms() {
        return "admin/mushrooms";
    }

    // 센서 타입 등록
    @GetMapping("/admin/sensors")
    public String sensors() {
        return "admin/sensors";
    }
}