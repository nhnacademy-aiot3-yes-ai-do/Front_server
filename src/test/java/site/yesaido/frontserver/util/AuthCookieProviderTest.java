package site.yesaido.frontserver.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthCookieProviderTest {

    private final AuthCookieProvider authCookieProvider = new AuthCookieProvider();

    @Test
    @DisplayName("setAuthCookies - refreshToken과 role이 모두 존재하는 정상 케이스")
    void setAuthCookiesFull() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.setAuthCookies(response, "accessVal", "refreshVal", "USER");

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertEquals(3, cookies.size());

        assertTrue(cookies.stream().anyMatch(c -> c.contains("accessToken=accessVal") && c.contains("HttpOnly") && c.contains("SameSite=Lax")));
        assertTrue(cookies.stream().anyMatch(c -> c.contains("refreshToken=refreshVal")));
        assertTrue(cookies.stream().anyMatch(c -> c.contains("role=USER")));
    }

    @Test
    @DisplayName("setAuthCookies - refreshToken과 role이 null인 케이스 분기")
    void setAuthCookiesWithNulls() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.setAuthCookies(response, "accessVal", null, null);

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertEquals(1, cookies.size());
        assertTrue(cookies.getFirst().contains("accessToken=accessVal"));
    }

    @Test
    @DisplayName("clearAuthCookies - 쿠키 삭제 처리")
    void clearAuthCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.clearAuthCookies(response);

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertEquals(3, cookies.size());
        assertTrue(cookies.stream().allMatch(c -> c.contains("Max-Age=0")));
    }
}
