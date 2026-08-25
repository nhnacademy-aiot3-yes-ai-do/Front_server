package site.yesaido.frontserver.config;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Disabled("WebConfig에서 content-hash 캐시버스팅(VersionResourceResolver)을 의도적으로 뺀 상태(개발 중 브라우저가 " +
        "들고 있던 예전 해시 URL과 서버가 계산하는 최신 해시가 어긋나 정적 리소스가 404로 깨지는 문제 때문). " +
        "운영 배포 시점에 다시 붙이면 이 테스트도 같이 재활성화할 것.")
class StaticAssetVersioningIntegrationTest {

    private static final Pattern COMMON_JS_URL = Pattern.compile("/js/common-[0-9a-f]+\\.js");

    @LocalServerPort
    private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void loginPageRendersContentVersionedJavaScriptThatIsServedSuccessfully() throws Exception {
        HttpResponse<String> loginPage = sendGet("/login");

        assertEquals(200, loginPage.statusCode());
        Matcher matcher = COMMON_JS_URL.matcher(loginPage.body());
        assertTrue(matcher.find(), "The login page must render a content-versioned common.js URL");

        HttpResponse<String> javascript = sendGet(matcher.group());

        assertEquals(200, javascript.statusCode());
        assertTrue(javascript.headers().firstValue("Content-Type")
                .orElse("")
                .startsWith("text/javascript"));
    }

    private HttpResponse<String> sendGet(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
