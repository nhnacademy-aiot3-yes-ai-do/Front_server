package site.yesaido.frontserver.controller.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryResponse;
import site.yesaido.frontserver.dto.user.response.MemberSummaryPageResponse;
import site.yesaido.frontserver.dto.user.response.MemberSummaryResponse;
import site.yesaido.frontserver.util.LoginRequired;
import site.yesaido.frontserver.util.ViewJsonWriter;

import java.util.List;

@Slf4j
@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
public class AdminViewController {

    private static final int DASHBOARD_INQUIRY_PREVIEW_SIZE = 4;
    private static final int DASHBOARD_MEMBER_PREVIEW_SIZE = 4;

    private final InquiryClient inquiryClient;
    private final SensorClient sensorClient;
    private final UserClient userClient;
    private final ViewJsonWriter viewJsonWriter;

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
            MushroomReferenceInfoListResponse mushroomReferences = sensorClient.getAllMushroomReferences().getBody();
            if (mushroomReferences != null && mushroomReferences.mushroomReferenceInfoResponses() != null) {
                mushroomCount = mushroomReferences.mushroomReferenceInfoResponses().size();
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 버섯 종류 조회 실패", e);
        }

        List<MemberSummaryResponse> recentMembers = List.of();
        long totalMemberCount = 0;
        try {
            Pageable pageable = PageRequest.of(0, DASHBOARD_MEMBER_PREVIEW_SIZE, Sort.by(Sort.Direction.DESC, "createdAt"));
            ApiResponse<MemberSummaryPageResponse> response = userClient.getMembers("active", pageable);
            MemberSummaryPageResponse page = response != null ? response.data() : null;
            if (page != null) {
                recentMembers = page.content() != null ? page.content() : List.of();
                totalMemberCount = page.totalElements() != null ? page.totalElements() : 0;
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 회원 정보 조회 실패", e);
        }

        model.addAttribute("pendingInquiries", pendingInquiries);
        model.addAttribute("pendingInquiryCount", pendingInquiryCount);
        model.addAttribute("mushroomCount", mushroomCount);
        model.addAttribute("recentMembers", recentMembers);
        model.addAttribute("totalMemberCount", totalMemberCount);

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
    public String mushrooms(Model model) {
        SensorTypeInfoListResponse sensorTypes = fetchSensorTypes();
        MushroomReferenceInfoListResponse mushroomReferences = fetchMushroomReferences();

        model.addAttribute("sensorTypesJson", viewJsonWriter.toScriptJson(sensorTypes));
        model.addAttribute("mushroomsJson", viewJsonWriter.toScriptJson(mushroomReferences));

        return "admin/mushrooms";
    }

    // 센서 타입 등록
    @GetMapping("/admin/sensors")
    public String sensors(Model model) {
        SensorTypeInfoListResponse sensorTypes = fetchSensorTypes();

        model.addAttribute("sensorTypesJson", viewJsonWriter.toScriptJson(sensorTypes));

        return "admin/sensors";
    }

    private SensorTypeInfoListResponse fetchSensorTypes() {
        try {
            SensorTypeInfoListResponse body = sensorClient.getSensorTypes().getBody();
            return body != null ? body : new SensorTypeInfoListResponse(List.of());
        } catch (Exception e) {
            log.warn("관리자: 센서 타입 조회 실패", e);
            return new SensorTypeInfoListResponse(List.of());
        }
    }

    private MushroomReferenceInfoListResponse fetchMushroomReferences() {
        try {
            MushroomReferenceInfoListResponse body = sensorClient.getAllMushroomReferences().getBody();
            return body != null ? body : new MushroomReferenceInfoListResponse(List.of());
        } catch (Exception e) {
            log.warn("관리자: 버섯 기준 정보 조회 실패", e);
            return new MushroomReferenceInfoListResponse(List.of());
        }
    }
}