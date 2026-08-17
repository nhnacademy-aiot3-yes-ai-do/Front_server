package site.yesaido.frontserver.exception;

import feign.FeignException;
import feign.Request;
import feign.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private AuthCookieProvider authCookieProvider;

    @InjectMocks
    private GlobalExceptionHandler handler;

    @Test
    @DisplayName("handleUnauthorized - 쿠키 클리어 및 /login 리다이렉트 처리")
    void handleUnauthorizedTest() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.handleUnauthorized(response);

        verify(authCookieProvider).clearAuthCookies(response);
        assertEquals("/login", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("handleDormantUserException - 플래시 속성 추가 및 redirect:/login 반환")
    void handleDormantUserExceptionTest() {
        DormantUserException ex = new DormantUserException("dormant@naver.com", "휴면 계정입니다.");
        RedirectAttributesModelMap redirectAttributes = new RedirectAttributesModelMap();

        String view = handler.handleDormantUserException(ex, redirectAttributes);

        assertEquals("redirect:/login", view);
        assertTrue((Boolean) redirectAttributes.getFlashAttributes().get("isDormant"));
        assertEquals("dormant@naver.com", redirectAttributes.getFlashAttributes().get("dormantEmail"));
    }

    @Test
    @DisplayName("Feign 오류 상태와 응답 본문을 유지")
    void handleFeignExceptionPreservesStatusAndBody() {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "/api/v1/notification-endpoints",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                null
        );
        Response response = Response.builder()
                .status(503)
                .reason("Service Unavailable")
                .request(request)
                .headers(Collections.emptyMap())
                .body("{\"detail\":\"알림 서버를 사용할 수 없습니다.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus("getEndpoints", response);

        ResponseEntity<Object> result = handler.handleFeignException(exception);

        assertEquals(503, result.getStatusCode().value());
        assertEquals("{\"detail\":\"알림 서버를 사용할 수 없습니다.\"}", result.getBody());
    }
}
