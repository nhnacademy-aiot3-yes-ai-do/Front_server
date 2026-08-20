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
    @DisplayName("setAuthCookies - 만료 시각을 포함한 인증 쿠키를 생성한다")
    void setAuthCookiesWithExpiration() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.setAuthCookies(response, "accessVal", "refreshVal", "USER", 1_755_671_400_000L);

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertEquals(4, cookies.size());

        assertTrue(cookies.stream().anyMatch(c -> c.contains("accessToken=accessVal") && c.contains("HttpOnly") && c.contains("SameSite=Lax")));
        assertTrue(cookies.stream().anyMatch(c -> c.contains("refreshToken=refreshVal")));
        assertTrue(cookies.stream().anyMatch(c -> c.contains("role=USER")));
        assertTrue(cookies.stream().anyMatch(c -> c.contains("accessTokenExpiresAt=1755671400000")
                && !c.contains("HttpOnly")));
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
        assertEquals(4, cookies.size());
        assertTrue(cookies.stream().allMatch(c -> c.contains("Max-Age=0")));
    }
}
