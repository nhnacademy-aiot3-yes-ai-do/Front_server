package site.yesaido.frontserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import site.yesaido.frontserver.config.FeignConfig;

@SpringBootApplication
@EnableFeignClients(defaultConfiguration = FeignConfig.class)
public class FrontServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(FrontServerApplication.class, args);
    }

}
