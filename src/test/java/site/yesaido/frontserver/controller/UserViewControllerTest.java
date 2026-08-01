package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.controller.user.UserViewController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserViewController.class)
class UserViewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void myPageRequestReturnsProfileView() throws Exception {
        mockMvc.perform(get("/mypage"))
                .andExpect(status().isOk())
                .andExpect(view().name("user/profile"));
    }

    @Test
    void signupPageReturnsSignupView() throws Exception {
        mockMvc.perform(get("/signup"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup"));
    }

    @Test
    void loginPageReturnsLoginView() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/login"));
    }

    @Test
    void signupNicknamePageReturnsViewWithEmailAndPassword() throws Exception {
        mockMvc.perform(get("/signup-nickname")
                        .param("email", "test@test.com")
                        .param("password", "password123"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup-nickname"))
                .andExpect(model().attribute("email", "test@test.com"))
                .andExpect(model().attribute("password", "password123"));
    }

    @Test
    void verifyCodePageReturnsViewWithEmail() throws Exception {
        mockMvc.perform(get("/verify-code").param("email", "test@test.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/verify-code"))
                .andExpect(model().attribute("email", "test@test.com"));
    }
}