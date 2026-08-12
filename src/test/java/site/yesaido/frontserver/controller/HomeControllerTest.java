package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.util.AuthCookieProvider;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HomeController.class)
@Import(AuthCookieProvider.class)
class HomeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void homeWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void homeWithBlankAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/").cookie(new Cookie("accessToken", "")))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void homeWithAccessTokenReturnsCultivationListView() throws Exception {
        mockMvc.perform(get("/").cookie(new Cookie("accessToken", "demo-access-token")))
                .andExpect(status().is3xxRedirection())
                .andExpect(view().name("redirect:/cultivations"));
    }
}