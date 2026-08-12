package site.yesaido.frontserver.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.IOException;

@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
    private final AuthCookieProvider authCookieProvider;

    @ExceptionHandler(FeignException.Unauthorized.class)
    public void handleUnauthorized(HttpServletResponse response) throws IOException {
        authCookieProvider.clearAuthCookies(response);
        response.sendRedirect("/login");
    }
}
