package site.yesaido.frontserver.exception;

import feign.FeignException;
import feign.Request;
import feign.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.ErrorResponse;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import site.yesaido.frontserver.controller.AuthResultController;
import site.yesaido.frontserver.dto.react.AuthResultResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private AuthCookieProvider authCookieProvider;

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = JsonMapper.builder().build();
        handler = new GlobalExceptionHandler(authCookieProvider, objectMapper);
    }

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
        MockHttpSession session = new MockHttpSession();

        String view = handler.handleDormantUserException(ex, redirectAttributes, session);

        assertEquals("redirect:/login", view);
        assertTrue((Boolean) redirectAttributes.getFlashAttributes().get("isDormant"));
        assertEquals("dormant@naver.com", redirectAttributes.getFlashAttributes().get("dormantEmail"));
        AuthResultResponse result = (AuthResultResponse) session.getAttribute(
                AuthResultController.AUTH_RESULT_SESSION_KEY
        );
        assertEquals("dormant", result.type());
        assertEquals("dormant@naver.com", result.email());
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
    @DisplayName("Feign 400 발생 시 upstream 안내 메시지와 상태를 그대로 반환")
    void handleFeignExceptionReturns400WithUpstreamMessage() {
        Request request = Request.create(
                Request.HttpMethod.POST, "/api/v1/auth/password-reset/email/send",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null
        );
        Response response = Response.builder()
                .status(400).reason("Bad Request").request(request)
                .headers(Collections.emptyMap())
                .body("{\"message\":\"Google로 가입한 계정입니다. Google로 로그인해 주세요.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus("UserClient#sendPasswordResetEmail(EmailSendResponse)", response);

        ErrorResponse result = (ErrorResponse) handler.handleFeignException(exception, new MockHttpServletRequest());

        assertEquals(400, result.getStatusCode().value());
        assertEquals("Google로 가입한 계정입니다. Google로 로그인해 주세요.", result.getBody().getDetail());
    }

    @Test
    @DisplayName("일일 피드백 접근 거부 응답은 403과 upstream 안내 메시지를 유지")
    void handleDailyFeedbackForbiddenKeepsStatusAndMessage() {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "/api/v1/ai/cultivations/27/daily-feedbacks/2026-09-02",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                null
        );
        Response response = Response.builder()
                .status(403).reason("Forbidden").request(request)
                .headers(Collections.emptyMap())
                .body("{\"detail\":\"해당 재배지의 일일 피드백을 조회할 권한이 없습니다.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus(
                "AiClient#getDailyFeedback(Long,LocalDate)",
                response
        );

        ErrorResponse result = (ErrorResponse) handler.handleFeignException(
                exception,
                new MockHttpServletRequest()
        );

        assertEquals(403, result.getStatusCode().value());
        assertEquals(
                "해당 재배지의 일일 피드백을 조회할 권한이 없습니다.",
                result.getBody().getDetail()
        );
    }

    @Test
    @DisplayName("일일 피드백 404는 버섯 가이드가 아닌 upstream 피드백 안내 메시지를 반환")
    void handleDailyFeedbackNotFoundUsesFeedbackMessage() {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "/api/v1/ai/cultivations/27/daily-feedbacks/2026-09-02",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                null
        );
        Response response = Response.builder()
                .status(404).reason("Not Found").request(request)
                .headers(Collections.emptyMap())
                .body("{\"detail\":\"해당 날짜의 일일 피드백이 존재하지 않습니다.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus(
                "AiClient#getDailyFeedback(Long,LocalDate)",
                response
        );

        ErrorResponse result = (ErrorResponse) handler.handleFeignException(
                exception,
                new MockHttpServletRequest()
        );

        assertEquals(404, result.getStatusCode().value());
        assertEquals("해당 날짜의 일일 피드백이 존재하지 않습니다.", result.getBody().getDetail());
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

        assertEquals("/", result.getModel().get("path"));
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

    @Test
    @DisplayName("Feign 409 발생 시 upstream 안내 메시지와 409 Conflict 상태를 그대로 반환한다")
    void handleFeignExceptionReturns409WithUpstreamMessage() {
        Request request = Request.create(
                Request.HttpMethod.PUT, "/api/v1/cultivations/1/harvest-mode",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null
        );
        Response response = Response.builder()
                .status(409).reason("Conflict").request(request)
                .headers(Collections.emptyMap())
                .body("{\"message\":\"이미 사용 중인 이메일입니다.\"}", StandardCharsets.UTF_8)
                .build();
        FeignException exception = FeignException.errorStatus("CultivationClient#switchToHarvestMode(Long)", response);

        ErrorResponse result = (ErrorResponse) handler.handleFeignException(exception, new MockHttpServletRequest());

        assertEquals(409, result.getStatusCode().value());
        assertEquals("이미 사용 중인 이메일입니다.", result.getBody().getDetail());
    }

    @Test
    @DisplayName("Feign의 기타 4xx 상태와 upstream 메시지를 그대로 반환한다")
    void handleFeignExceptionReturnsOtherClientErrorsWithUpstreamMessage() {
        Map<Integer, String> cases = Map.of(
                403, "접근 권한이 없습니다.",
                405, "지원하지 않는 요청 방식입니다.",
                413, "업로드할 수 있는 파일 용량을 초과했습니다.",
                415, "지원하지 않는 요청 형식입니다.",
                429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
        );

        cases.forEach((status, message) -> {
            Request request = Request.create(
                    Request.HttpMethod.POST, "/api/v1/users/signup",
                    Collections.emptyMap(), null, StandardCharsets.UTF_8, null
            );
            Response response = Response.builder()
                    .status(status).reason("Client Error").request(request)
                    .headers(Collections.emptyMap())
                    .body("{\"message\":\"" + message + "\"}", StandardCharsets.UTF_8)
                    .build();
            FeignException exception = FeignException.errorStatus("UserClient#request()", response);

            ErrorResponse result = (ErrorResponse) handler.handleFeignException(exception, new MockHttpServletRequest());

            assertEquals(status.intValue(), result.getStatusCode().value());
            assertEquals(message, result.getBody().getDetail());
        });
    }

    @Test
    @DisplayName("Front에서 직접 감지한 파일 용량 초과는 413을 반환한다")
    void handleMaxUploadSizeExceededExceptionReturns413() {
        ErrorResponse result = handler.handleMaxUploadSizeExceededException(
                new MaxUploadSizeExceededException(8 * 1024 * 1024)
        );

        assertEquals(413, result.getStatusCode().value());
        assertEquals("사진 파일 크기는 8MB를 초과할 수 없습니다.", result.getBody().getDetail());
    }
}
