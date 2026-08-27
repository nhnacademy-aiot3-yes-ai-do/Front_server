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

    // 알림 이벤트 등록 화면(admin-notification-events.js)이 아직 브라우저 메모리 목업이라
    // 실제 개수를 서버에서 조회할 방법이 없음. 그 파일의 초기 목업 데이터 개수(3개)와 맞춰둠.
    // Notification_service에 CRUD API가 생기면 이 상수 대신 실제 조회 결과로 바꾸면 됨.
    private static final int MOCK_NOTIFICATION_EVENT_COUNT = 3;

    @GetMapping("/admin")
    public String admin(Model model) {
        loadPendingInquiries(model);
        loadMushroomCount(model);
        loadSensorTypeCount(model);
        loadRecentMembers(model);
        model.addAttribute("notificationEventCount", MOCK_NOTIFICATION_EVENT_COUNT);
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

    // 알림 이벤트 등록
    // Notification_service 쪽에 이벤트 타입을 관리하는 API가 아직 없어서 Feign 호출 없이
    // 화면만 렌더링함. 초기 목업 데이터는 admin-notification-events.js에 직접 들고 있고,
    // 저장/수정/삭제도 전부 브라우저 메모리에서만 동작함(새로고침하면 초기화).
    // 나중에 Notification_service에 CRUD API가 생기면 sensors()처럼 Feign 클라이언트로 바꾸면 됨.
    @GetMapping("/admin/notification-events")
    public String notificationEvents() {
        return "admin/notification-events";
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

    private void loadPendingInquiries(Model model) {
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
        model.addAttribute("pendingInquiries", pendingInquiries);
        model.addAttribute("pendingInquiryCount", pendingInquiryCount);
    }

    private void loadMushroomCount(Model model) {
        int mushroomCount = 0;
        try {
            MushroomReferenceInfoListResponse mushroomReferences = sensorClient.getAllMushroomReferences().getBody();
            if (mushroomReferences != null && mushroomReferences.mushroomReferenceInfoResponses() != null) {
                mushroomCount = mushroomReferences.mushroomReferenceInfoResponses().size();
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 버섯 종류 조회 실패", e);
        }
        model.addAttribute("mushroomCount", mushroomCount);
    }

    private void loadSensorTypeCount(Model model) {
        int sensorTypeCount = 0;
        try {
            SensorTypeInfoListResponse sensorTypes = sensorClient.getSensorTypes().getBody();
            if (sensorTypes != null && sensorTypes.sensorTypeInfoResponses() != null) {
                sensorTypeCount = sensorTypes.sensorTypeInfoResponses().size();
            }
        } catch (Exception e) {
            log.warn("관리자 대시보드: 센서 타입 조회 실패", e);
        }
        model.addAttribute("sensorTypeCount", sensorTypeCount);
    }

    private void loadRecentMembers(Model model) {
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
        model.addAttribute("recentMembers", recentMembers);
        model.addAttribute("totalMemberCount", totalMemberCount);
    }
}