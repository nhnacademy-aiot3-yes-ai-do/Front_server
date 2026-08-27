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
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.ErrorResponse;
import org.springframework.web.servlet.ModelAndView;
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
    void handleUnauthorizedTest() {
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
    @DisplayName("Feign 404 발생 시 버섯 가이드 안내 메시지 반환")
    void handleFeignExceptionReturns404Message() {
        Request request = Request.create(
                Request.HttpMethod.GET, "/api/v1/mushrooms/1/guide",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null
        );
        Response response = Response.builder()
                .status(404).reason("Not Found").request(request)
                .headers(Collections.emptyMap())
                .build();
        FeignException exception = FeignException.errorStatus("AiClient#getMushroomGuide(Long)", response);

        // Accept 헤더를 안 주면 fetch() 기본값(*/*)과 동일하게 취급되어 JSON(ErrorResponse)으로 응답함
        ErrorResponse result = (ErrorResponse) handler.handleFeignException(exception, new MockHttpServletRequest());

        assertEquals(404, result.getStatusCode().value());
        assertEquals("해당 버섯 가이드 정보를 찾을 수 없습니다.", result.getBody().getDetail());
    }

    @Test
    @DisplayName("Feign 404 외 오류 발생 시 503과 알림 서비스 안내 메시지 반환")
    void handleFeignExceptionReturns503ForOtherStatuses() {
        Request request = Request.create(
                Request.HttpMethod.GET, "/api/v1/notification-endpoints",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null
        );
        Response response = Response.builder()
                .status(503).reason("Service Unavailable").request(request)
                .headers(Collections.emptyMap())
                .body("{\"detail\":\"알림 서버를 사용할 수 없습니다.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus("NotificationClient#getEndpoints()", response);

        ErrorResponse result = (ErrorResponse) handler.handleFeignException(exception, new MockHttpServletRequest());

        assertEquals(503, result.getStatusCode().value());
        assertEquals("알림 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.", result.getBody().getDetail());
    }

    @Test
    @DisplayName("페이지 요청(Accept: text/html) 중 Feign 오류 발생 시 JSON 대신 error 뷰를 반환")
    void handleFeignExceptionReturnsErrorViewForHtmlRequest() {
        Request request = Request.create(
                Request.HttpMethod.GET, "/api/v1/cultivations/1",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null
        );
        Response response = Response.builder()
                .status(503).reason("Service Unavailable").request(request)
                .headers(Collections.emptyMap())
                .build();
        FeignException exception = FeignException.errorStatus("CultivationClient#getCultivation(Long)", response);

        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.addHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        httpRequest.setRequestURI("/cultivations/1");

        ModelAndView result = (ModelAndView) handler.handleFeignException(exception, httpRequest);

        assertEquals("error", result.getViewName());
        assertEquals(503, result.getStatus().value());
        assertEquals("/cultivations/1", result.getModel().get("path"));
    }

    @Test
    @DisplayName("페이지 요청 중 처리되지 않은 예외 발생 시 JSON 대신 error 뷰를 반환")
    void handleUnexpectedReturnsErrorViewForHtmlRequest() {
        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.addHeader("Accept", "text/html");
        httpRequest.setRequestURI("/cultivations");

        Object result = handler.handleUnexpected(new RuntimeException("boom"), httpRequest);

        assertTrue(result instanceof ModelAndView);
        ModelAndView mav = (ModelAndView) result;
        assertEquals("error", mav.getViewName());
        assertEquals(500, mav.getStatus().value());
    }
}