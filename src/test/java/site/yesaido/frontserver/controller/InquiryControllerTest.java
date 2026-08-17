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
import site.yesaido.frontserver.dto.cultivation.response.cultivation.CultivationSummaryResponse;
import site.yesaido.frontserver.dto.inquiry.request.InquiryCreateRequest;
import site.yesaido.frontserver.dto.inquiry.request.InquiryMessageRequest;
import site.yesaido.frontserver.dto.inquiry.response.InquiryCategoryResponse;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        value = InquiryController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthCookieProvider.class)
class InquiryControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InquiryClient inquiryClient;

    @MockitoBean
    private CultivationClient cultivationClient;

    @Test
    @DisplayName("문의 카테고리 목록 조회")
    void getCategoriesSuccess() throws Exception {
        InquiryCategoryResponse category = new InquiryCategoryResponse(1L, "재배 관련");
        when(inquiryClient.getCategories())
                .thenReturn(new ApiResponse<>(true, "조회 성공", List.of(category)));

        mockMvc.perform(get("/support/inquiries/categories").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].categoryName").value("재배 관련"));
    }

    @Test
    @DisplayName("문의 등록")
    void createInquirySuccess() throws Exception {
        InquiryCreateRequest request = new InquiryCreateRequest(1L, "제목", "내용", null);
        InquiryDetailResponse detail = new InquiryDetailResponse(
                1L, 10L, "닉네임", 1L, "재배 관련", "제목", null, LocalDateTime.now(), null, null, List.of());
        when(inquiryClient.createInquiry(any(InquiryCreateRequest.class)))
                .thenReturn(new ApiResponse<>(true, "등록 성공", detail));

        mockMvc.perform(post("/support/inquiries")
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(inquiryClient).createInquiry(request);
    }

    @Test
    @DisplayName("내 문의 목록 조회 - 기본 page/size")
    void getMyInquiriesSuccess() throws Exception {
        InquirySummaryPageResponse page = new InquirySummaryPageResponse(List.of(), 0, 0L, 0, 20);
        when(inquiryClient.getMyInquiries(0, 20))
                .thenReturn(new ApiResponse<>(true, "조회 성공", page));

        mockMvc.perform(get("/support/inquiries").cookie(LOGGED_IN))
                .andExpect(status().isOk());

        verify(inquiryClient).getMyInquiries(0, 20);
    }

    @Test
    @DisplayName("내 문의 상세 조회")
    void getMyInquiryDetailSuccess() throws Exception {
        InquiryDetailResponse detail = new InquiryDetailResponse(
                1L, 10L, "닉네임", 1L, "재배 관련", "제목", null, LocalDateTime.now(), null, null, List.of());
        when(inquiryClient.getMyInquiryDetail(1L))
                .thenReturn(new ApiResponse<>(true, "조회 성공", detail));

        mockMvc.perform(get("/support/inquiries/{inquiry-id}", 1L).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("제목"));
    }

    @Test
    @DisplayName("문의 추가 메시지 등록")
    void addFollowUpSuccess() throws Exception {
        InquiryMessageRequest request = new InquiryMessageRequest("추가 문의 내용");
        InquiryDetailResponse detail = new InquiryDetailResponse(
                1L, 10L, "닉네임", 1L, "재배 관련", "제목", null, LocalDateTime.now(), null, null, List.of());
        when(inquiryClient.addFollowUp(eq(1L), any(InquiryMessageRequest.class)))
                .thenReturn(new ApiResponse<>(true, "등록 성공", detail));

        mockMvc.perform(post("/support/inquiries/{inquiry-id}/messages", 1L)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(inquiryClient).addFollowUp(1L, request);
    }

    @Test
    @DisplayName("내 재배지 목록 조회 - 정상 데이터 분기")
    void getMyCultivationsWithData() throws Exception {
        CultivationSummaryResponse summary = new CultivationSummaryResponse(
                1L, "재배지1", 10L, "GROWTH", "GROWTH", 2, "오너닉네임", LocalDateTime.now());
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(List.of(summary)));

        mockMvc.perform(get("/support/inquiries/my-cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("재배지1"));
    }

    @Test
    @DisplayName("내 재배지 목록 조회 - null 응답 분기")
    void getMyCultivationsWithNullBody() throws Exception {
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(null));

        mockMvc.perform(get("/support/inquiries/my-cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }
}