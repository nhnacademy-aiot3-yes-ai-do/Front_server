package site.yesaido.frontserver.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

/*
* 지금 이 요청에서 Feign 호출할 때 쓸 accessToken이 뭔지를 들고 있는 요청 단위 캐시
* 인터셉터와 에러 디코더가 이번 요청 안에서 토큰을 주고받는 통로
* */

@Component
@RequestScope
public class RequestTokenHolder {
    private String accessToken;
    private boolean initialized;

    public String resolveAccessToken(HttpServletRequest request) {
        if (!initialized) {
            accessToken = cookieValue(request, "accessToken");
            initialized = true;
        }
        return accessToken;
    }

    public void refreshAccessToken(String newAccessToken) {
        this.accessToken = newAccessToken;
    }

    private String cookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;

        for (Cookie cookie : request.getCookies()) {
            if (cookie.getName().equals(name)) return cookie.getValue();
        }
        return null;
    }


}
