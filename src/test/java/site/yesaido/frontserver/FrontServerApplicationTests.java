package site.yesaido.frontserver;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.notification.request.SubscriptionEnabledRequest;

import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FrontServerApplicationTests {
    private static final AtomicReference<String> REQUEST_METHOD = new AtomicReference<>();
    private static final HttpServer GATEWAY_SERVER = createGatewayServer();

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private NotificationClient notificationClient;

    @BeforeEach
    void resetGatewayRequestMethod() {
        REQUEST_METHOD.set(null);
    }

    @Test
    void contextLoads() {
        // 이 테스트는 별도 assertion 없이, Spring ApplicationContext가
        // 정상적으로 로딩되는지만 확인하기 위한 의도된 빈 메서드입니다.
        // 컨텍스트 로딩에 실패하면 이 테스트 자체가 예외로 실패합니다.
        assertThat(applicationContext).isNotNull();

    }

    @Test
    void notificationClientSendsPatchToGateway() {
        notificationClient.changeSubscriptionEnabled(20L, new SubscriptionEnabledRequest(false));

        assertThat(REQUEST_METHOD.get()).isEqualTo("PATCH");
    }

    @DynamicPropertySource
    static void gatewayUrl(DynamicPropertyRegistry registry) {
        registry.add("feign.client.gateway.url", () -> "http://localhost:" + GATEWAY_SERVER.getAddress().getPort());
    }

    @AfterAll
    static void stopGatewayServer() {
        GATEWAY_SERVER.stop(0);
    }

    private static HttpServer createGatewayServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/api/v1/notification-subscriptions/20/enabled", exchange -> {
                REQUEST_METHOD.set(exchange.getRequestMethod());
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
            });
            server.start();
            return server;
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Failed to start test Gateway server", exception);
        }
    }
}
