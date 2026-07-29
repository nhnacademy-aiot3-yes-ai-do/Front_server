package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @CsvSource({
            "/login, auth/login",
            "/signup, auth/signup",
            "/find-password, auth/find-password"
    })
    void pageRequestReturnsExpectedView(String path, String expectedView) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(view().name(expectedView));
    }

    @Test
    void signupNicknamePagePassesSignupInformationToView() throws Exception {
        mockMvc.perform(get("/signup-nickname")
                        .param("email", "user@example.com")
                        .param("password", "secret"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/signup-nickname"))
                .andExpect(model().attribute("email", "user@example.com"))
                .andExpect(model().attribute("password", "secret"));
    }

    @Test
    void verifyCodePagePassesEmailToView() throws Exception {
        mockMvc.perform(get("/verify-code")
                        .param("email", "user@example.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/verify-code"))
                .andExpect(model().attribute("email", "user@example.com"));
    }

    @Test
    void resetPasswordPagePassesEmailToView() throws Exception {
        mockMvc.perform(get("/reset-password")
                        .param("email", "user@example.com")
                        .param("code", "123456"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/reset-password"))
                .andExpect(model().attribute("email", "user@example.com"));
    }

    @Test
    void loginSubmissionSetsAccessTokenCookieAndRedirectsToHome() throws Exception {
        MvcResult result = mockMvc.perform(post("/login")
                        .param("email", "user@example.com")
                        .param("password", "secret"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"))
                .andReturn();

        Cookie accessToken = result.getResponse().getCookie("accessToken");

        assertNotNull(accessToken);
        assertAll(
                () -> assertEquals("demo-access-token", accessToken.getValue()),
                () -> assertEquals(60 * 60 * 24, accessToken.getMaxAge()),
                () -> assertEquals("/", accessToken.getPath()),
                () -> assertTrue(accessToken.isHttpOnly()),
                () -> assertTrue(accessToken.getSecure())
        );
    }

    @Test
    void loginSubmissionWithoutCredentialsReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/login"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signupSubmissionRedirectsToLogin() throws Exception {
        mockMvc.perform(post("/signup"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void resetPasswordShowsErrorWhenPasswordsDoNotMatch() throws Exception {
        mockMvc.perform(post("/reset-password")
                        .param("email", "user@example.com")
                        .param("newPassword", "new-password")
                        .param("confirmPassword", "different-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("auth/reset-password"))
                .andExpect(model().attribute("email", "user@example.com"))
                .andExpect(model().attribute(
                        "resetPasswordError",
                        "비밀번호가 일치하지 않습니다."
                ));
    }

    @Test
    void resetPasswordRedirectsWhenPasswordsMatch() throws Exception {
        mockMvc.perform(post("/reset-password")
                        .param("email", "user@example.com")
                        .param("newPassword", "new-password")
                        .param("confirmPassword", "new-password"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void logoutClearsAuthenticationCookies() throws Exception {
        MvcResult result = mockMvc.perform(post("/logout")
                        .cookie(new Cookie("accessToken", "access-token")))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andReturn();

        Cookie accessToken = result.getResponse().getCookie("accessToken");
        Cookie refreshToken = result.getResponse().getCookie("refreshToken");

        assertAll(
                () -> assertClearedCookie(accessToken, "accessToken"),
                () -> assertClearedCookie(refreshToken, "refreshToken")
        );
    }

    private void assertClearedCookie(Cookie cookie, String expectedName) {
        assertNotNull(cookie);
        assertEquals(expectedName, cookie.getName());
        assertNull(cookie.getValue());
        assertEquals(0, cookie.getMaxAge());
        assertEquals("/", cookie.getPath());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.getSecure());
    }
}