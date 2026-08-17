package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
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
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = AdminController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CultivationClient cultivationClient;

    @MockitoBean
    private InquiryClient inquiryClient;

    private static final Cookie ADMIN_COOKIE = new Cookie("role", "ADMIN");
    private static final Cookie ACCESS_COOKIE = new Cookie("accessToken", "adminToken");

    @Test
    @DisplayName("어드민 메인 화면 접근 - 로그인 및 ADMIN 쿠키 보유 시 정상")
    void adminIndexView() throws Exception {
        mockMvc.perform(get("/admin").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/index"));
    }

    @Test
    @DisplayName("어드민 회원 관리 화면 접근")
    void adminMembersView() throws Exception {
        mockMvc.perform(get("/admin/members").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/members"));
    }

    @Test
    @DisplayName("어드민 문의 관리 화면 접근")
    void adminInquiriesView() throws Exception {
        mockMvc.perform(get("/admin/inquiries").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/inquiries"));
    }

    @Test
    @DisplayName("어드민 버섯 도감 관리 화면 접근")
    void adminMushroomsView() throws Exception {
        mockMvc.perform(get("/admin/mushrooms").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/mushrooms"));
    }

    @Test
    @DisplayName("문의 전체 목록 조회 - status 파라미터 없음")
    void getAllInquiriesWithoutStatus() throws Exception {
        InquirySummaryPageResponse page = new InquirySummaryPageResponse(List.of(), 0, 0L, 0, 20);
        when(inquiryClient.getAllInquiries(null, 0, 20))
                .thenReturn(new ApiResponse<>(true, "조회 성공", page));

        mockMvc.perform(get("/admin/inquiries/list").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(inquiryClient).getAllInquiries(null, 0, 20);
    }

    @Test
    @DisplayName("문의 전체 목록 조회 - status/page/size 파라미터 있음")
    void getAllInquiriesWithStatus() throws Exception {
        InquirySummaryPageResponse page = new InquirySummaryPageResponse(List.of(), 1, 5L, 1, 10);
        when(inquiryClient.getAllInquiries(InquiryStatus.PENDING, 1, 10))
                .thenReturn(new ApiResponse<>(true, "조회 성공", page));

        mockMvc.perform(get("/admin/inquiries/list")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .param("status", "PENDING")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk());

        verify(inquiryClient).getAllInquiries(InquiryStatus.PENDING, 1, 10);
    }

    @Test
    @DisplayName("문의 상세 조회 (관리자)")
    void getInquiryDetailSuccess() throws Exception {
        InquiryDetailResponse detail = new InquiryDetailResponse(
                1L, 10L, "닉네임", 2L, "카테고리", "제목", null, LocalDateTime.now(), null, null, List.of());
        when(inquiryClient.getInquiryDetailForAdmin(1L))
                .thenReturn(new ApiResponse<>(true, "조회 성공", detail));

        mockMvc.perform(get("/admin/inquiries/{inquiry-id}", 1L).cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("제목"));
    }

    @Test
    @DisplayName("문의 답변 등록 (관리자)")
    void answerMessageSuccess() throws Exception {
        InquiryMessageRequest request = new InquiryMessageRequest("답변 내용");
        InquiryDetailResponse detail = new InquiryDetailResponse(
                1L, 10L, "닉네임", 2L, "카테고리", "제목", null, LocalDateTime.now(), null, null, List.of());
        when(inquiryClient.answerMessage(eq(1L), any(InquiryMessageRequest.class)))
                .thenReturn(new ApiResponse<>(true, "답변 등록 성공", detail));

        mockMvc.perform(put("/admin/inquiries/messages/{answer-id}", 1L)
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(inquiryClient).answerMessage(1L, request);
    }

    @Test
    @DisplayName("버섯 도감 목록 조회")
    void getMushroomReferencesSuccess() throws Exception {
        when(cultivationClient.getAllMushroomReferences())
                .thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/admin/mushroom-references").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("버섯 도감 등록")
    void createMushroomReferenceSuccess() throws Exception {
        MushroomReferenceRequest request = new MushroomReferenceRequest("양송이", "Button mushroom", "Agaricus bisporus", List.of());
        when(cultivationClient.registerMushroomReference(any(MushroomReferenceRequest.class)))
                .thenReturn(ResponseEntity.ok().build());

        mockMvc.perform(post("/admin/mushroom-references")
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(cultivationClient).registerMushroomReference(request);
    }

    @Test
    @DisplayName("버섯 도감 수정")
    void updateMushroomReferenceSuccess() throws Exception {
        MushroomReferenceRequest request = new MushroomReferenceRequest("양송이", "Button mushroom", "Agaricus bisporus", List.of());
        when(cultivationClient.updateMushroomReference(eq(1L), any(MushroomReferenceRequest.class)))
                .thenReturn(ResponseEntity.ok().build());

        mockMvc.perform(put("/admin/mushroom-references/{mushroom-reference-id}", 1L)
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(cultivationClient).updateMushroomReference(1L, request);
    }

    @Test
    @DisplayName("버섯 도감 삭제")
    void deleteMushroomReferenceSuccess() throws Exception {
        when(cultivationClient.deleteMushroomReference(1L)).thenReturn(ResponseEntity.ok().build());

        mockMvc.perform(delete("/admin/mushroom-references/{mushroom-reference-id}", 1L)
                        .cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk());

        verify(cultivationClient).deleteMushroomReference(1L);
    }

    @Test
    @DisplayName("센서 타입 목록 조회")
    void getSensorTypesSuccess() throws Exception {
        when(cultivationClient.getSensorTypes())
                .thenReturn(ResponseEntity.ok(new SensorTypeInfoListResponse(List.of())));

        mockMvc.perform(get("/admin/sensor-types").cookie(ACCESS_COOKIE, ADMIN_COOKIE))
                .andExpect(status().isOk());
    }
}