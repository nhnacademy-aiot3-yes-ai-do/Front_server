package site.yesaido.frontserver.util;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieProvider {
    private static final String ACCESS_TOKEN = "accessToken";
    private static final String REFRESH_TOKEN = "refreshToken";
    private static final String ROLE = "role";

    public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, String role) {
        addCookie(response, ACCESS_TOKEN, accessToken, -1);
        if (refreshToken != null) {
            addCookie(response, REFRESH_TOKEN, refreshToken, -1);
        }
        if (role != null) {
            addCookie(response, ROLE, role, -1);
        }
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_TOKEN, "", 0);
        addCookie(response, REFRESH_TOKEN, "", 0);
        addCookie(response, ROLE, "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .path("/").httpOnly(true).sameSite("Lax");
        if (maxAgeSeconds >= 0) {
            builder.maxAge(maxAgeSeconds);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }
}
