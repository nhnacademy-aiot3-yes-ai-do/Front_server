package site.yesaido.frontserver.config;

import feign.RequestTemplate;
import feign.codec.Encoder;
import feign.form.spring.SpringFormEncoder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

class FeignConfigTest {

    private final FeignConfig feignConfig = new FeignConfig();

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("reissue 요청 URL이면 Cookie 헤더를 전달하지 않는다")
    void authInterceptorSkipsReissueUrl() {
        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/v1/auth/reissue");

        feignConfig.authInterceptor().apply(template);

        verify(template, never()).removeHeader(HttpHeaders.COOKIE);
        verify(template, never()).header(eq(HttpHeaders.COOKIE), any(String[].class));
    }

    @Test
    @DisplayName("logout 요청 URL이면 Cookie 헤더를 전달하지 않는다")
    void authInterceptorSkipsLogoutUrl() {
        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/v1/auth/logout");

        feignConfig.authInterceptor().apply(template);

        verify(template, never()).removeHeader(HttpHeaders.COOKIE);
        verify(template, never()).header(eq(HttpHeaders.COOKIE), any(String[].class));
    }

    @Test
    @DisplayName("RequestContextHolder에 요청 정보가 없으면 아무 것도 하지 않는다")
    void authInterceptorNoRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(template, never()).removeHeader(HttpHeaders.COOKIE);
        verify(template, never()).header(eq(HttpHeaders.COOKIE), any(String[].class));
    }

    @Test
    @DisplayName("요청 Cookie 헤더를 Gateway 요청으로 그대로 전달한다")
    void authInterceptorForwardsCookieHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.COOKIE, "accessToken=access-token; refreshToken=refresh-token");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(template).removeHeader(HttpHeaders.COOKIE);
        verify(template).header(HttpHeaders.COOKIE, "accessToken=access-token; refreshToken=refresh-token");
        verify(template, never()).header(eq(HttpHeaders.AUTHORIZATION), any(String[].class));
    }

    @Test
    @DisplayName("Cookie 헤더가 없으면 Gateway 요청 헤더를 변경하지 않는다")
    void authInterceptorWithoutCookieDoesNotChangeHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(template, never()).removeHeader(HttpHeaders.COOKIE);
        verify(template, never()).header(eq(HttpHeaders.COOKIE), any(String[].class));
    }


    @Test
    @DisplayName("feignEncoder 빈은 SpringFormEncoder를 반환한다")
    void feignEncoderReturnsSpringFormEncoder() {
        @SuppressWarnings("unchecked")
        ObjectProvider<FeignHttpMessageConverters> provider = mock(ObjectProvider.class);

        Encoder encoder = feignConfig.feignEncoder(provider);

        assertInstanceOf(SpringFormEncoder.class, encoder);
    }
}
