package site.yesaido.frontserver.controller.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.LoginRequest;
import site.yesaido.frontserver.dto.user.request.UserSignUpRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(AuthCookieProvider.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserClient userClient;

    @Test
    @DisplayName("이메일 중복 확인 요청 시 UserClient 호출 및 결과 반환")
    void checkEmailSuccess() throws Exception {
        given(userClient.checkEmail("test@naver.com")).willReturn(new ApiResponse<>(true, "조회 성공", true));

        mockMvc.perform(get("/users/check-email").param("email", "test@naver.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(userClient).checkEmail("test@naver.com");
    }

    @Test
    @DisplayName("이메일 중복 확인 실패 또는 null 응답 시 false 반환")
    void checkEmailFailedResponseReturnsFalse() throws Exception {
        given(userClient.checkEmail("fail@naver.com")).willReturn(new ApiResponse<>(false, "조회 실패", null));

        mockMvc.perform(get("/users/check-email").param("email", "fail@naver.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("닉네임 중복 확인 요청 시 UserClient 호출 및 결과 반환")
    void checkNicknameSuccess() throws Exception {
        given(userClient.checkNickname("nickTest")).willReturn(new ApiResponse<>(true, "조회 성공", false));

        mockMvc.perform(get("/users/check-nickname").param("nickname", "nickTest"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));

        verify(userClient).checkNickname("nickTest");
    }

    @Test
    @DisplayName("회원가입 요청 시 UserClient 호출 후 로그인 페이지로 리다이렉트")
    void signupSuccess() throws Exception {
        mockMvc.perform(post("/signup")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!")
                        .param("nickname", "nickTest"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));

        verify(userClient).signUp(any(UserSignUpRequest.class));
    }

    @Test
    @DisplayName("로그인 요청 성공 시 쿠키 세팅 후 메인 페이지로 리다이렉트")
    void loginSuccess() throws Exception {
        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("mockAccessToken")
                .refreshToken("mockRefreshToken")
                .build();

        given(userClient.login(any(LoginRequest.class))).willReturn(new ApiResponse<>(true, "로그인 성공", tokenResponse));

        mockMvc.perform(post("/login")
                        .param("email", "test@naver.com")
                        .param("password", "nhn123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"))
                .andExpect(header().exists("Set-Cookie"));

        verify(userClient).login(any(LoginRequest.class));
    }

    @Test
    @DisplayName("로그아웃 요청 시 레디스 파기 호출 및 쿠키 삭제 후 로그인 페이지로 리다이렉트")
    void logoutSuccess() throws Exception {
        mockMvc.perform(post("/logout")
                        .header("X-User-Id", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andExpect(header().exists("Set-Cookie"));

        verify(userClient).logout(eq(1L));
    }
}
