package site.yesaido.frontserver;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FrontServerApplicationTests {
    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void contextLoads() {
        // 이 테스트는 별도 assertion 없이, Spring ApplicationContext가
        // 정상적으로 로딩되는지만 확인하기 위한 의도된 빈 메서드입니다.
        // 컨텍스트 로딩에 실패하면 이 테스트 자체가 예외로 실패합니다.
        assertThat(applicationContext).isNotNull();

    }

}
