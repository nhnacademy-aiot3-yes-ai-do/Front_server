package site.yesaido.frontserver.config;

import feign.RequestInterceptor;
import feign.Retryer;
import feign.codec.Encoder;
import feign.codec.ErrorDecoder;
import feign.form.spring.SpringFormEncoder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import site.yesaido.frontserver.auth.RequestTokenHolder;
import site.yesaido.frontserver.auth.TokenReissueErrorDecoder;

@Configuration
@RequiredArgsConstructor
public class FeignConfig {
    private final RequestTokenHolder requestTokenHolder;
    private final TokenReissueErrorDecoder tokenReissueErrorDecoder;

    @Bean
    public RequestInterceptor authInterceptor() {
        return requestTemplate -> {
            if (requestTemplate.url().contains("/api/auth/reissue")) {
                return;
            }
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;

            HttpServletRequest request = attrs.getRequest();
            String token = requestTokenHolder.resolveAccessToken(request);
            if (token != null) {
                requestTemplate.removeHeader("Authorization");
                requestTemplate.header("Authorization", "Bearer " + token);
            }
        };
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return tokenReissueErrorDecoder;
    }

    @Bean
    public Retryer retryer() {
        return new Retryer.Default(100, 100, 2);
    }

    @Bean
    public Encoder feignEncoder(ObjectProvider<FeignHttpMessageConverters> messageConverters) {
        return new SpringFormEncoder(new SpringEncoder(messageConverters));
    }
}