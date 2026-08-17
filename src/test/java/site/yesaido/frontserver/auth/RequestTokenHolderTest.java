package site.yesaido.frontserver.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RequestTokenHolderTest {

    private final RequestTokenHolder holder = new RequestTokenHolder();

    @Test
    @DisplayName("accessToken 쿠키가 있으면 해당 값을 반환한다")
    void resolveAccessTokenReturnsCookieValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("accessToken", "cookieToken"));

        String result = holder.resolveAccessToken(request);

        assertEquals("cookieToken", result);
    }

    @Test
    @DisplayName("쿠키 자체가 없으면 null을 반환한다")
    void resolveAccessTokenReturnsNullWhenNoCookies() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        String result = holder.resolveAccessToken(request);

        assertNull(result);
    }

    @Test
    @DisplayName("쿠키는 있지만 accessToken 이름이 없으면 null을 반환한다")
    void resolveAccessTokenReturnsNullWhenCookieNameNotFound() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("otherCookie", "value"));

        String result = holder.resolveAccessToken(request);

        assertNull(result);
    }

    @Test
    @DisplayName("한 번 resolve된 이후에는 쿠키가 바뀌어도 최초 값을 캐싱해서 반환한다")
    void resolveAccessTokenCachesAfterFirstCall() {
        MockHttpServletRequest firstRequest = new MockHttpServletRequest();
        firstRequest.setCookies(new Cookie("accessToken", "firstToken"));
        holder.resolveAccessToken(firstRequest);

        MockHttpServletRequest secondRequest = new MockHttpServletRequest();
        secondRequest.setCookies(new Cookie("accessToken", "secondToken"));
        String result = holder.resolveAccessToken(secondRequest);

        assertEquals("firstToken", result);
    }

    @Test
    @DisplayName("refreshAccessToken으로 갱신하면 이후 resolveAccessToken은 쿠키를 다시 읽지 않고 갱신된 값을 반환한다")
    void refreshAccessTokenOverridesCachedValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("accessToken", "oldToken"));
        holder.resolveAccessToken(request);

        holder.refreshAccessToken("newToken");

        MockHttpServletRequest anotherRequest = new MockHttpServletRequest();
        anotherRequest.setCookies(new Cookie("accessToken", "oldToken"));
        String result = holder.resolveAccessToken(anotherRequest);

        assertEquals("newToken", result);
    }
}