package site.yesaido.frontserver.logging;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@Slf4j
public class SensorBffCompletionLoggingInterceptor implements HandlerInterceptor {
    private static final String STARTED_AT_ATTRIBUTE = SensorBffCompletionLoggingInterceptor.class.getName() + ".startedAt";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (endpointName(request) != null) {
            request.setAttribute(STARTED_AT_ATTRIBUTE, System.nanoTime());
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception exception) {
        String endpoint = endpointName(request);
        if (endpoint == null) {
            return;
        }

        log.info("front_bff_completion endpoint={} status={} handler={} exception_type={} elapsed_ms={}",
                endpoint,
                response.getStatus(),
                handlerName(handler),
                exception == null ? "none" : exception.getClass().getSimpleName(),
                elapsedMillis(request));
    }

    private String endpointName(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        if ("/cultivations/sensor-types".equals(requestUri)) {
            return "sensor-types";
        }
        if (requestUri.matches("/cultivations/\\d+/sensors")) {
            return "cultivation-sensors";
        }
        return null;
    }

    private String handlerName(Object handler) {
        if (handler instanceof HandlerMethod handlerMethod) {
            return handlerMethod.getBeanType().getSimpleName() + "." + handlerMethod.getMethod().getName();
        }
        return handler.getClass().getSimpleName();
    }

    private long elapsedMillis(HttpServletRequest request) {
        Object startedAt = request.getAttribute(STARTED_AT_ATTRIBUTE);
        if (startedAt instanceof Long startedAtNanos) {
            return (System.nanoTime() - startedAtNanos) / 1_000_000;
        }
        return -1;
    }
}
