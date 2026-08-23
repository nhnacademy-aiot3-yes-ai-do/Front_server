package site.yesaido.frontserver.filter;

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
public class UncaughtErrorLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            chain.doFilter(request, response);
        } catch (Throwable t) {
            HttpServletRequest req = (HttpServletRequest) request;
            log.error("필터 체인 최상단에서 처리되지 않은 Throwable 발생: uri={} type={}",
                    req.getRequestURI(), t.getClass().getName(), t);
            throw t;
        }
    }
}