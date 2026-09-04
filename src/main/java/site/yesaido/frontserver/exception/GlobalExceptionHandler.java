package site.yesaido.frontserver.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import site.yesaido.frontserver.controller.AuthResultController;
import site.yesaido.frontserver.dto.react.AuthResultResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    private static final Pattern METHOD_KEY_PATTERN = Pattern.compile("\\[(\\w+)#");
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final String ERROR = "error";
    private static final String MESSAGE = "message";
    private static final String DETAIL = "detail";

    private static final Map<String, String> NOT_FOUND_MESSAGES = Map.of(
            "AiClient", "해당 버섯 가이드 정보를 찾을 수 없습니다.",
            "CultivationClient", "해당 재배 정보를 찾을 수 없습니다.",
            "SensorClient", "해당 센서 정보를 찾을 수 없습니다.",
            "NotificationClient", "해당 알림 정보를 찾을 수 없습니다.",
            "UserClient", "해당 회원 정보를 찾을 수 없습니다.",
            "InquiryClient", "해당 문의 정보를 찾을 수 없습니다."
    );

    private static final String DEFAULT_NOT_FOUND_MESSAGE = "요청하신 정보를 찾을 수 없습니다.";

    private static final Map<String, String> UNAVAILABLE_MESSAGES = Map.of(
            "AiClient", "AI 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
            "CultivationClient", "재배 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
            "SensorClient", "센서 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
            "NotificationClient", "알림 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
            "UserClient", "회원 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
            "InquiryClient", "문의 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요."
    );
    private static final String DEFAULT_UNAVAILABLE_MESSAGE = "외부 서비스 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
    private static final String DEFAULT_CONFLICT_MESSAGE = "요청을 처리할 수 없는 상태예요. 새로고침 후 다시 시도해 주세요.";
    private static final String DEFAULT_FORBIDDEN_MESSAGE = "요청한 정보에 접근할 권한이 없습니다.";
    private static final String DAILY_FEEDBACK_NOT_FOUND_MESSAGE = "해당 날짜의 일일 피드백을 찾을 수 없습니다.";
    private static final String DEFAULT_CLIENT_ERROR_MESSAGE = "요청을 처리할 수 없습니다. 입력 값을 확인해 주세요.";

    private final AuthCookieProvider authCookieProvider;
    private final ObjectMapper objectMapper;

    // 브라우저가 페이지를 직접 열 때(주소 입력, 링크 클릭, 폼 제출 등)는 Accept 헤더에 text/html이
    // 명시적으로 들어감. dashboard.js 등의 fetch() 호출은 Accept를 따로 안 지정해서 기본값(*/*)이라
    // 이 조건에 안 걸림 — 그래서 이 값으로 "페이지 요청이냐 AJAX 요청이냐"를 구분함.
    private boolean wantsHtml(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains("text/html");
    }

    // templates/error.html이 기대하는 모델(status, path)을 채워서 커스텀 에러 페이지를 렌더링.
    // 예전엔 아래 catch-all 핸들러들이 무조건 JSON을 반환해서, 페이지 로딩 중 터진 예외는
    // Spring의 기본 /error 디스패치(→ error.html)까지 가지도 못하고 여기서 JSON으로 가로채져
    // 브라우저엔 알맹이 없는 JSON 텍스트만 보이는 문제가 있었음.
    private ModelAndView errorView(HttpServletRequest request, HttpStatus status, String message) {
        ModelAndView mav = new ModelAndView(ERROR);
        mav.setStatus(status);
        mav.addObject("status", status.value());
        mav.addObject(ERROR, status.getReasonPhrase());
        mav.addObject(MESSAGE, message);
        mav.addObject("path", errorPagePath(request));
        mav.addObject("timestamp", LocalDateTime.now(KOREA_ZONE));
        return mav;
    }

    private String errorPagePath(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/admin".equals(path) || path.startsWith("/admin/") ? "/admin" : "/";
    }

    @ExceptionHandler(FeignException.Unauthorized.class)
    public void handleUnauthorized(HttpServletResponse response) {
        try {
            authCookieProvider.clearAuthCookies(response);
            if (!response.isCommitted()) {
                response.sendRedirect("/login");
            } else {
                log.warn("응답이 이미 커밋되어 /login으로 리다이렉트하지 못했습니다.");
            }
        } catch (Exception e) {
            log.error("handleUnauthorized 처리 중 예외 발생: {}", e.getClass().getName(), e);
            try {
                if (!response.isCommitted()) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"detail\":\"로그인이 필요합니다.\"}");
                }
            } catch (IOException ignored) {
                // 이 시점엔 응답에 더 이상 쓸 수 있는 게 없음
            }
        }
    }

    @ExceptionHandler(FeignException.class)
    public Object handleFeignException(FeignException e, HttpServletRequest request) {
        String clientName = extractClientName(e);
        logFeignException(clientName, e);

        HttpStatus status = resolveStatus(e.status());
        String message = resolveMessage(e, status, clientName);

        if (wantsHtml(request)) {
            return errorView(request, status, message);
        }
        return ErrorResponse.create(e, status, message);
    }

    private HttpStatus resolveStatus(int feignStatus) {
        return switch (feignStatus) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 403 -> HttpStatus.FORBIDDEN;
            case 404 -> HttpStatus.NOT_FOUND;
            case 405 -> HttpStatus.METHOD_NOT_ALLOWED;
            case 409 -> HttpStatus.CONFLICT;
            case 413 -> HttpStatus.CONTENT_TOO_LARGE;
            case 415 -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.SERVICE_UNAVAILABLE;
        };
    }

    private String resolveMessage(FeignException exception, HttpStatus status, String clientName) {
        if (status == HttpStatus.BAD_REQUEST) {
            return extractFeignMessage(exception, "요청이 올바르지 않습니다.");
        }
        if (status == HttpStatus.FORBIDDEN) {
            return extractFeignMessage(exception, DEFAULT_FORBIDDEN_MESSAGE);
        }
        if (status == HttpStatus.NOT_FOUND) {
            if (isDailyFeedbackRequest(exception)) {
                return extractFeignMessage(exception, DAILY_FEEDBACK_NOT_FOUND_MESSAGE);
            }
            return NOT_FOUND_MESSAGES.getOrDefault(clientName, DEFAULT_NOT_FOUND_MESSAGE);
        }
        if (status.is4xxClientError()) {
            return extractFeignMessage(exception, DEFAULT_CLIENT_ERROR_MESSAGE);
        }
        return UNAVAILABLE_MESSAGES.getOrDefault(clientName, DEFAULT_UNAVAILABLE_MESSAGE);
    }

    private void logFeignException(String clientName, FeignException exception) {
        if (exception.status() >= 400 && exception.status() < 500) {
            log.warn("{} 요청 거절 (Status: {}): {}", clientName, exception.status(), exception.getMessage());
            return;
        }
        log.error("{} 통신 실패 (Status: {}): {}", clientName, exception.status(), exception.getMessage());
    }

    private String extractFeignMessage(FeignException exception, String fallback) {
        try {
            JsonNode response = objectMapper.readTree(exception.contentUTF8());
            String message = response.path(MESSAGE).asString();
            if (message.isBlank()) {
                message = response.path(DETAIL).asString();
            }
            return message.isBlank() ? fallback : message;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private boolean isDailyFeedbackRequest(FeignException exception) {
        return exception.request() != null
                && exception.request().url().contains("/daily-feedbacks/");
    }

    private String extractClientName(FeignException e) {
        String message = e.getMessage();
        if (message == null) return "unknown";
        Matcher matcher = METHOD_KEY_PATTERN.matcher(message);
        return matcher.find() ? matcher.group(1) : "unknown";
    }

    @ExceptionHandler(DormantUserException.class)
    public String handleDormantUserException(
            DormantUserException e,
            RedirectAttributes redirectAttributes,
            HttpSession session
    ) {
        redirectAttributes.addFlashAttribute("isDormant", true);
        redirectAttributes.addFlashAttribute("dormantEmail", e.getEmail());
        session.setAttribute(
                AuthResultController.AUTH_RESULT_SESSION_KEY,
                new AuthResultResponse("dormant", e.getMessage(), e.getEmail())
        );
        return "redirect:/login";
    }

    @ExceptionHandler(MissingRefreshTokenException.class)
    public ResponseEntity<Object> handleMissingRefreshToken(MissingRefreshTokenException exception) {
        return ResponseEntity.status(HttpServletResponse.SC_UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(DETAIL, "로그인이 필요합니다."));
    }

    // css/js 정적 리소스는 파일 내용 해시가 URL에 붙는 캐시버스팅 방식(WebConfig의 VersionResourceResolver)을
    // 쓰고 있어서, 파일을 수정한 뒤 서버를 재시작해도 브라우저가 예전 HTML에 박혀있던 옛날 해시 URL로
    // 요청하면 매치되는 리소스를 못 찾아 이 예외가 던져짐. 아래 catch-all(Exception.class)이 이걸 잡아서
    // JSON 500으로 감싸버리면 브라우저가 "이건 CSS/JS가 아니잖아" 하며 아예 적용을 거부해서 스타일이
    // 통째로 깨져 보이는 문제가 있었음 — 그래서 정적 리소스 미존재는 평범한 404로 내려보냄.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Void> handleNoResourceFound(NoResourceFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(Exception.class)
    public Object handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("처리되지 않은 예외 발생: {}", exception.getClass().getName(), exception);
        String message = "일시적인 오류가 발생했습니다.";
        if (wantsHtml(request)) {
            return errorView(request, HttpStatus.INTERNAL_SERVER_ERROR, message);
        }
        return ResponseEntity.status(500)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(DETAIL, message));
    }

    @ExceptionHandler(Throwable.class)
    public Object handleThrowable(Throwable e, HttpServletRequest request) {
        log.error("처리되지 않은 Error 발생: {}", e.getClass().getName(), e);
        String message = "일시적인 서버 오류가 발생했습니다.";
        if (wantsHtml(request)) {
            return errorView(request, HttpStatus.INTERNAL_SERVER_ERROR, message);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR, "internal_server_error", MESSAGE, message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ErrorResponse handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String defaultMessage = (fieldError != null) ? fieldError.getDefaultMessage() : null;
        String message = Objects.requireNonNullElse(defaultMessage, "잘못된 요청입니다.");

        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ErrorResponse handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException e) {
        String message = "요청 값의 형식이 올바르지 않습니다: " + e.getName();
        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ErrorResponse handleMissingRequestHeaderException(MissingRequestHeaderException e) {
        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, "필수 헤더가 누락되었습니다: " + e.getHeaderName());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ErrorResponse handleMissingServletRequestParameterException(MissingServletRequestParameterException e) {
        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, "필수 파라미터가 누락되었습니다: " + e.getParameterName());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ErrorResponse handleMaxUploadSizeExceededException(MaxUploadSizeExceededException e) {
        return ErrorResponse.create(e, HttpStatus.CONTENT_TOO_LARGE, "사진 파일 크기는 8MB를 초과할 수 없습니다.");
    }

    @ExceptionHandler(TooManyFilesException.class)
    public ErrorResponse handleTooManyFilesException(TooManyFilesException e) {
        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
