package site.yesaido.frontserver.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthCookieProviderTest {

    private final AuthCookieProvider authCookieProvider = new AuthCookieProvider();

    @Test
    @DisplayName("setAuthCookies - refreshToken과 role이 모두 존재하는 정상 케이스")
    void setAuthCookiesFull() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.setAuthCookies(response, "accessVal", "refreshVal", "USER");

        assertEquals(3, response.getHeaders("Set-Cookie").size());
    }

    @Test
    @DisplayName("setAuthCookies - refreshToken과 role이 null인 케이스 분기")
    void setAuthCookiesWithNulls() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.setAuthCookies(response, "accessVal", null, null);

        assertEquals(1, response.getHeaders("Set-Cookie").size());
    }

    @Test
    @DisplayName("clearAuthCookies - 쿠키 삭제 처리")
    void clearAuthCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieProvider.clearAuthCookies(response);

        assertEquals(3, response.getHeaders("Set-Cookie").size());
    }
}
