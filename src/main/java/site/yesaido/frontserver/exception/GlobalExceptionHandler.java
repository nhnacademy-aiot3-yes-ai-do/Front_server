package site.yesaido.frontserver.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    private static final Pattern METHOD_KEY_PATTERN = Pattern.compile("\\[(\\w+)#");

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

    private final AuthCookieProvider authCookieProvider;

    @ExceptionHandler(FeignException.Unauthorized.class)
    public void handleUnauthorized(HttpServletResponse response) {
        try {
            authCookieProvider.clearAuthCookies(response);
            if (!response.isCommitted()) {
                response.sendRedirect("/login");
            } else {
                log.warn("응답이 이미 커밋되어 /login으로 리다이렉트하지 못했습니다.");
            }
        } catch (Throwable t) {
            log.error("handleUnauthorized 처리 중 예외 발생: {}", t.getClass().getName(), t);
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
    public ErrorResponse handleFeignException(FeignException e) {
        String clientName = extractClientName(e);
        log.error("{} 통신 실패 (Status: {}): {}", clientName, e.status(), e.getMessage());

        if (e.status() == 404) {
            return ErrorResponse.create(e, HttpStatus.NOT_FOUND,
                    NOT_FOUND_MESSAGES.getOrDefault(clientName, DEFAULT_NOT_FOUND_MESSAGE));
        }
        return ErrorResponse.create(e, HttpStatus.SERVICE_UNAVAILABLE,
                UNAVAILABLE_MESSAGES.getOrDefault(clientName, DEFAULT_UNAVAILABLE_MESSAGE));
    }

    private String extractClientName(FeignException e) {
        String message = e.getMessage();
        if (message == null) return "unknown";
        Matcher matcher = METHOD_KEY_PATTERN.matcher(message);
        return matcher.find() ? matcher.group(1) : "unknown";
    }

    @ExceptionHandler(DormantUserException.class)
    public String handleDormantUserException(DormantUserException e, RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("isDormant", true);
        redirectAttributes.addFlashAttribute("dormantEmail", e.getEmail());
        return "redirect:/login";
    }

    @ExceptionHandler(MissingRefreshTokenException.class)
    public ResponseEntity<Object> handleMissingRefreshToken(MissingRefreshTokenException exception) {
        return ResponseEntity.status(HttpServletResponse.SC_UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("detail", "로그인이 필요합니다."));
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
    public ResponseEntity<Object> handleUnexpected(Exception exception) {
        log.error("처리되지 않은 예외 발생: {}", exception.getClass().getName(), exception);
        return ResponseEntity.status(500)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("detail", "일시적인 오류가 발생했습니다."));
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<Object> handleThrowable(Throwable e) {
        log.error("처리되지 않은 Error 발생: {}", e.getClass().getName(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "internal_server_error", "message", "일시적인 서버 오류가 발생했습니다."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ErrorResponse handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String defaultMessage = (fieldError != null) ? fieldError.getDefaultMessage() : null;
        String message = Objects.requireNonNullElse(defaultMessage, "잘못된 요청입니다.");

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
        return ErrorResponse.create(e, HttpStatus.BAD_REQUEST, "사진 파일 크기는 8MB를 초과할 수 없습니다.");
    }
}