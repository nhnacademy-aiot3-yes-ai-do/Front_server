package site.yesaido.frontserver.config;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignHttpMessageConvertersWarmupConfig {

    @Bean
    public SmartInitializingSingleton feignHttpMessageConvertersWarmup(
            FeignHttpMessageConverters feignHttpMessageConverters) {
        return feignHttpMessageConverters::getConverters;
    }
}