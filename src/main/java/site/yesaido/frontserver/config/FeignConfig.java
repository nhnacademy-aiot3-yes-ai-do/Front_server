package site.yesaido.frontserver.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor authInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;

            HttpServletRequest request = attrs.getRequest();
            Cookie[] cookies = request.getCookies();
            if (cookies == null) return;
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("accessToken")) {
                    requestTemplate.header("Authorization", "Bearer " + cookie.getValue());
                    break;
                }
            }
        };
    }
}
