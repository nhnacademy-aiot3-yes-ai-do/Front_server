package site.yesaido.frontserver.logging;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UncaughtExceptionLoggingFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            chain.doFilter(request, response);
        } catch (Exception exception) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            log.error("uncaught_filter_exception method={} uri={} error_type={}",
                    httpRequest.getMethod(), httpRequest.getRequestURI(),
                    exception.getClass().getName(), exception);
            throw exception;
        }
    }
}