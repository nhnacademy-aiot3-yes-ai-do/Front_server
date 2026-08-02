package site.yesaido.frontserver.controller.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserViewController.class)
class UserViewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("마이페이지 요청 시 user/profile 뷰 반환")
    void myPageRequestReturnsProfileView() throws Exception {
        mockMvc.perform(get("/mypage"))
                .andExpect(status().isOk())
                .andExpect(view().name("user/profile"));
    }

    @Test
    @DisplayName("회원가입 페이지 요청 시 auth/signup 뷰 반환")
    void signupPageReturnsSignupView() throws Exception {
        mockMvc.perform(get("/signup"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup"));
    }

    @Test
    @DisplayName("로그인 페이지 요청 시 auth/login 뷰 반환")
    void loginPageReturnsLoginView() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/login"));
    }

    @Test
    @DisplayName("닉네임 회원가입 페이지 요청 시 파라미터 전달 및 auth/signup-nickname 뷰 반환")
    void signupNicknamePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/signup-nickname")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup-nickname"))
                .andExpect(model().attribute("email", "test@naver.com"))
                .andExpect(model().attribute("password", "nhn123!"));
    }

    @Test
    @DisplayName("이메일 인증번호 입력 페이지 요청 시 auth/verify-code 뷰 반환")
    void verifyCodePageReturnsViewWithModel() throws Exception {
        mockMvc.perform(get("/verify-code")
                        .param("email", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/verify-code"))
                .andExpect(model().attribute("email", "test@naver.com"));
    }
}
