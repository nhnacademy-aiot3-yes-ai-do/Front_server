package site.yesaido.frontserver.config;

import feign.RequestTemplate;
import feign.Retryer;
import feign.codec.Encoder;
import feign.codec.ErrorDecoder;
import feign.form.spring.SpringFormEncoder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import site.yesaido.frontserver.auth.RequestTokenHolder;
import site.yesaido.frontserver.auth.TokenReissueErrorDecoder;
import site.yesaido.frontserver.auth.TokenReissueOnlyRetryer;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeignConfigTest {

    @Mock
    private RequestTokenHolder requestTokenHolder;

    @Mock
    private TokenReissueErrorDecoder tokenReissueErrorDecoder;

    private FeignConfig feignConfig;

    @BeforeEach
    void setUp() {
        feignConfig = new FeignConfig(requestTokenHolder, tokenReissueErrorDecoder);
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("reissue 요청 URL이면 토큰 조회 없이 그대로 반환한다")
    void authInterceptorSkipsReissueUrl() {
        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/auth/reissue");

        feignConfig.authInterceptor().apply(template);

        verify(requestTokenHolder, never()).resolveAccessToken(any());
        verify(template, never()).header(eq("Authorization"), any(String[].class));
    }

    @Test
    @DisplayName("RequestContextHolder에 요청 정보가 없으면 아무 것도 하지 않는다")
    void authInterceptorNoRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(requestTokenHolder, never()).resolveAccessToken(any());
        verify(template, never()).header(eq("Authorization"), any(String[].class));
    }

    @Test
    @DisplayName("accessToken이 있으면 기존 헤더를 제거하고 Bearer 헤더를 새로 설정한다")
    void authInterceptorSetsAuthorizationHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        given(requestTokenHolder.resolveAccessToken(request)).willReturn("token123");

        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(template).removeHeader("Authorization");
        verify(template).header("Authorization", "Bearer token123");
    }

    @Test
    @DisplayName("accessToken이 없으면 Authorization 헤더를 건드리지 않는다")
    void authInterceptorNoTokenDoesNotSetHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        given(requestTokenHolder.resolveAccessToken(request)).willReturn(null);

        RequestTemplate template = mock(RequestTemplate.class);
        given(template.url()).willReturn("/api/cultivations");

        feignConfig.authInterceptor().apply(template);

        verify(template, never()).removeHeader(any());
        verify(template, never()).header(eq("Authorization"), any(String[].class));
    }

    @Test
    @DisplayName("errorDecoder 빈은 주입된 TokenReissueErrorDecoder를 그대로 반환한다")
    void errorDecoderReturnsInjectedDecoder() {
        ErrorDecoder decoder = feignConfig.errorDecoder();

        assertSame(tokenReissueErrorDecoder, decoder);
    }

    @Test
    @DisplayName("retryer 빈은 TokenReissueOnlyRetryer 인스턴스를 반환한다")
    void retryerReturnsTokenReissueOnlyRetryer() {
        Retryer retryer = feignConfig.retryer();

        assertInstanceOf(TokenReissueOnlyRetryer.class, retryer);
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