package site.yesaido.frontserver.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;
import java.util.Map;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    private final AuthCookieProvider authCookieProvider;

    @ExceptionHandler(FeignException.Unauthorized.class)
    public void handleUnauthorized(HttpServletResponse response) throws IOException {
        authCookieProvider.clearAuthCookies(response);
        try {
            if (!response.isCommitted()) {
                response.sendRedirect("/login");
            } else {
                log.warn("응답이 이미 커밋되어 /login으로 리다이렉트하지 못했습니다.");
            }
        } catch (Exception e) {
            log.warn("sendRedirect 실패: {}", e.getMessage());
            if (!response.isCommitted()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"detail\":\"로그인이 필요합니다.\"}");
            }
        }
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Object> handleFeignException(FeignException exception) {
        int status = exception.status() > 0 ? exception.status() : 502;
        String body = exception.contentUTF8();
        if (body == null || body.isBlank()) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("detail", "외부 서비스 요청에 실패했습니다."));
        }
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(DormantUserException.class)
    public String handleDormantUserException(DormantUserException e, RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("isDormant", true);
        redirectAttributes.addFlashAttribute("dormantEmail", e.getEmail());
        return "redirect:/login";
    }
}
