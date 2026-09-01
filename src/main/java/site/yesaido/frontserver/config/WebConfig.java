package site.yesaido.frontserver.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import site.yesaido.frontserver.logging.SensorBffCompletionLoggingInterceptor;
import site.yesaido.frontserver.util.LoginCheckInterceptor;

import java.util.concurrent.TimeUnit;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
    private final LoginCheckInterceptor interceptor;
    private final SensorBffCompletionLoggingInterceptor sensorBffCompletionLoggingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor);
        registry.addInterceptor(sensorBffCompletionLoggingInterceptor);
    }

    // css/js에 컨텐츠 해시 캐시버스팅(VersionResourceResolver)을 걸어뒀었는데, 개발 중 파일을 자주 고치다 보니
    // 브라우저가 들고 있는 예전 해시 URL과 서버가 계산하는 최신 해시가 어긋나서 정적 리소스가 계속
    // 404(및 그걸 감싼 JSON 500)로 깨지는 문제가 반복됐음. 운영 배포 시점에 다시 붙이더라도, 지금은
    // 그냥 고정 경로(/css/common.css 등)로 서빙해서 이 문제 자체를 없앰.
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/**")
                .addResourceLocations("classpath:/static/images/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/")
                .setCacheControl(CacheControl.noCache().cachePublic());

        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/")
                .setCacheControl(CacheControl.noCache().cachePublic());

        registry.addResourceHandler("/fonts/**")
                .addResourceLocations("classpath:/static/fonts/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/react/**")
                .addResourceLocations("classpath:/static/react/")
                .setCacheControl(CacheControl.noCache().cachePublic());
    }
}
