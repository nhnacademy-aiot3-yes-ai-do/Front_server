package site.yesaido.frontserver.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.regex.Pattern;

@Component
public class LoginCheckInterceptor implements HandlerInterceptor {
    // /cultivations/{id} 및 그 하위 경로에 대한 GET(조회), 그리고 /cultivations/{id} 자체에 대한 DELETE(문의자 요청에 따른 삭제)만 예외 허용
    private static final Pattern CULTIVATION_DETAIL_PATH = Pattern.compile("^/cultivations/\\d+(/.*)?$");
    private static final Pattern CULTIVATION_ID_ONLY_PATH = Pattern.compile("^/cultivations/\\d+$");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        LoginRequired loginRequired = handlerMethod.getMethodAnnotation(LoginRequired.class);
        if (loginRequired == null) {
            loginRequired = handlerMethod.getBeanType().getAnnotation(LoginRequired.class);
        }
        if (loginRequired == null) {
            return true;
        }

        String accessToken = cookieValue(request, "accessToken");
        if (!StringUtils.hasText(accessToken)) {
            response.sendRedirect("/login");
            return false;
        }

        String role = cookieValue(request, "role");

        if (loginRequired.adminOnly() && !"ADMIN".equals(role)) {
            response.sendRedirect("/");
            return false;
        }

        if ("ADMIN".equals(role) && isCultivationPathBlockedForAdmin(request)) {
            response.sendRedirect("/admin");
            return false;
        }

        return true;
    }

    private String cookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(cookie -> cookie.getName().equals(name))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private boolean isCultivationPathBlockedForAdmin(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/cultivations")) {
            return false;
        }
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) && CULTIVATION_DETAIL_PATH.matcher(path).matches()) {
            return false;
        }
        if ("DELETE".equalsIgnoreCase(method) && CULTIVATION_ID_ONLY_PATH.matcher(path).matches()) {
            return false;
        }
        return true;
    }
}
