package site.yesaido.frontserver.config;

import feign.RequestInterceptor;
import feign.codec.Encoder;
import feign.form.spring.SpringFormEncoder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {
    @Bean
    public RequestInterceptor authInterceptor() {
        return requestTemplate -> {
            if (requestTemplate.url().contains("/api/v1/auth/reissue") || requestTemplate.url().contains("/api/v1/auth/logout")) {
                return;
            }
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;

            HttpServletRequest request = attrs.getRequest();
            String cookieHeader = request.getHeader(HttpHeaders.COOKIE);

            if (cookieHeader == null || cookieHeader.isBlank()) {
               return;
            }

            requestTemplate.removeHeader(HttpHeaders.COOKIE);
            requestTemplate.header(HttpHeaders.COOKIE, cookieHeader);
        };
    }

    @Bean
    public Encoder feignEncoder(ObjectProvider<FeignHttpMessageConverters> messageConverters) {
        return new SpringFormEncoder(new SpringEncoder(messageConverters));
    }
}
