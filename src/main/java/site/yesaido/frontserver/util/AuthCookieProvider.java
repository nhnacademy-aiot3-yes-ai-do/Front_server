package site.yesaido.frontserver.util;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieProvider {
    private static final String ACCESS_TOKEN = "accessToken";
    private static final String REFRESH_TOKEN = "refreshToken";
    private static final String ROLE = "role";
    private static final String ACCESS_TOKEN_EXPIRES_AT = "accessTokenExpiresAt";

    @Value("${auth.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${auth.cookie.domain:}")
    private String cookieDomain;

    public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, String role) {
        setAuthCookies(response, accessToken, refreshToken, role, null);
    }

    public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, String role, Long accessTokenExpiresAt){
        addHttpOnlyCookie(response, ACCESS_TOKEN, accessToken, -1);


        if(refreshToken != null){
            addHttpOnlyCookie(response, REFRESH_TOKEN, "", 0);
            addRefreshTokenCookie(response, refreshToken, -1);
        }
        if(role != null){
            addHttpOnlyCookie(response, ROLE, role, -1);
        }

        if(accessTokenExpiresAt != null){
            addReadableCookie(response, ACCESS_TOKEN_EXPIRES_AT, String.valueOf(accessTokenExpiresAt), -1);
        }
    }

    private void addReadableCookie(
            HttpServletResponse response,
            String name,
            String value,
            int maxAgeSeconds
    ) {
        addCookie(response, name, value, maxAgeSeconds, false, "/");
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addHttpOnlyCookie(response, ACCESS_TOKEN, "", 0);
        addHttpOnlyCookie(response, REFRESH_TOKEN, "", 0);
        addRefreshTokenCookie(response, "", 0);
        addHttpOnlyCookie(response, ROLE, "", 0);
        addReadableCookie(response, ACCESS_TOKEN_EXPIRES_AT, "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds, boolean httpOnly, String path) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .path(path).httpOnly(httpOnly).secure(cookieSecure).sameSite("Lax");

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }

        if (maxAgeSeconds >= 0) {
            builder.maxAge(maxAgeSeconds);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }
    private void addHttpOnlyCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds){
        addCookie(response, name, value, maxAgeSeconds, true, "/");
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String value, int maxAgeSeconds){
        addCookie(response, REFRESH_TOKEN, value, maxAgeSeconds, true, "/users/reissue");
    }
}
