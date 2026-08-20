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
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.InquiryClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.controller.admin.AdminViewController;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.inquiry.InquiryStatus;
import site.yesaido.frontserver.dto.inquiry.response.InquirySummaryPageResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = AdminViewController.class,
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

    @MockitoBean
    private InquiryClient inquiryClient;

    @MockitoBean
    private SensorClient sensorClient;

    private static final Cookie ADMIN_COOKIE = new Cookie("role", "ADMIN");
    private static final Cookie ACCESS_COOKIE = new Cookie("accessToken", "adminToken");

    @Test
    @DisplayName("어드민 메인 화면 접근 - 로그인 및 ADMIN 쿠키 보유 시 정상")
    void adminIndexView() throws Exception {
        InquirySummaryPageResponse inquiryPage =
                new InquirySummaryPageResponse(
                        List.of(),
                        0,
                        0L,
                        0,
                        4
                );

        when(inquiryClient.getAllInquiries(
                InquiryStatus.PENDING,
                0,
                4
        )).thenReturn(
                new ApiResponse<>(true, "조회 성공", inquiryPage)
        );

        when(sensorClient.getAllMushroomReferences())
                .thenReturn(
                        ResponseEntity.ok(
                                new MushroomReferenceInfoListResponse(List.of())
                        )
                );

        mockMvc.perform(
                        get("/admin")
                                .cookie(ACCESS_COOKIE, ADMIN_COOKIE)
                )
                .andExpect(status().isOk())
                .andExpect(view().name("admin/index"))
                .andExpect(model().attribute("pendingInquiryCount", 0L))
                .andExpect(model().attribute("mushroomCount", 0));
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
}