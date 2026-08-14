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
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.util.AuthCookieProvider;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

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
}
