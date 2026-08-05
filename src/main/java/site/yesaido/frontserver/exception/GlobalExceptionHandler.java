package site.yesaido.frontserver.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.IOException;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(FeignException.Unauthorized.class)
    public void handleUnauthorized(HttpServletResponse response) throws IOException{
        ResponseCookie deleteAccessCookie = ResponseCookie.from("accessToken", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .build();

        ResponseCookie deleteRefreshCookie = ResponseCookie.from("refreshToken", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, deleteAccessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, deleteRefreshCookie.toString());

        response.sendRedirect("/login");
    }
}
