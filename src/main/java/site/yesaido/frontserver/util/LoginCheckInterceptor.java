package site.yesaido.frontserver.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;

@Component
public class LoginCheckInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        boolean required = handlerMethod.hasMethodAnnotation(LoginRequired.class)
                || handlerMethod.getBeanType().isAnnotationPresent(LoginRequired.class);

        if (!required) {
            return true;
        }

        Cookie[] cookies = request.getCookies();
        boolean haToken = cookies != null && Arrays.stream(cookies)
                .anyMatch(cookie -> cookie.getName().equals("accessToken") && StringUtils.hasText(cookie.getValue()));

        if (!haToken) {
            response.sendRedirect("/login");
            return false;
        }

        return true;
    }
}
