package site.yesaido.frontserver.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;

import java.util.Collection;

@Aspect
@Component
@Slf4j
public class FrontResponseLoggingAspect {

    @Around("@within(org.springframework.stereotype.Controller) || @within(org.springframework.web.bind.annotation.RestController)")
    public Object logControllerResponse(ProceedingJoinPoint joinPoint) throws Throwable {
        return logResponse(joinPoint, "front_controller_response");
    }

    @Around("execution(* site.yesaido.frontserver.client.SensorClient.*(..))")
    public Object logClientResponse(ProceedingJoinPoint joinPoint) throws Throwable {
        return logResponse(joinPoint, "front_client_response");
    }

    private Object logResponse(ProceedingJoinPoint joinPoint, String event) throws Throwable {
        long startedAt = System.nanoTime();
        String method = joinPoint.getSignature().toShortString();

        try {
            Object result = joinPoint.proceed();
            if (result instanceof ResponseEntity<?> response) {
                log.info("{} method={} status={} elapsed_ms={} {}",
                        event,
                        method,
                        response.getStatusCode().value(),
                        elapsedMillis(startedAt),
                        summarize(response.getBody()));
            } else if (isViewName(joinPoint, result)) {
                String viewName = (String) result;
                log.info("{} method={} view={} elapsed_ms={}", event, method, viewName, elapsedMillis(startedAt));
            } else {
                log.info("{} method={} result_type={} result_null={} elapsed_ms={}",
                        event,
                        method,
                        result == null ? "null" : result.getClass().getSimpleName(),
                        result == null,
                        elapsedMillis(startedAt));
            }
            return result;
        } catch (Throwable throwable) {
            log.warn("{} method={} outcome=exception error_type={} elapsed_ms={}",
                    event, method, throwable.getClass().getSimpleName(), elapsedMillis(startedAt));
            throw throwable;
        }
    }

    private String summarize(Object body) {
        if (body == null) {
            return "body_null=true";
        }
        if (body instanceof SensorTypeInfoListResponse response) {
            return collectionSummary("SensorTypeInfoListResponse", "sensor_type", response.sensorTypeInfoResponses());
        }
        if (body instanceof MushroomReferenceInfoListResponse response) {
            return collectionSummary("MushroomReferenceInfoListResponse", "mushroom_reference", response.mushroomReferenceInfoResponses());
        }
        return "body_type=" + body.getClass().getSimpleName() + " body_null=false";
    }

    private boolean isViewName(ProceedingJoinPoint joinPoint, Object result) {
        if (!(result instanceof String)) {
            return false;
        }

        Object target = joinPoint.getTarget();
        if (target == null) {
            return false;
        }

        Class<?> targetClass = ClassUtils.getUserClass(target);
        if (!AnnotatedElementUtils.hasAnnotation(targetClass, Controller.class)
                || AnnotatedElementUtils.hasAnnotation(targetClass, RestController.class)
                || AnnotatedElementUtils.hasAnnotation(targetClass, ResponseBody.class)) {
            return false;
        }

        return !(joinPoint.getSignature() instanceof MethodSignature methodSignature)
                || !AnnotatedElementUtils.hasAnnotation(methodSignature.getMethod(), ResponseBody.class);
    }

    private String collectionSummary(String bodyType, String collectionName, Collection<?> values) {
        return "body_type=" + bodyType
                + " body_null=false "
                + collectionName + "_list_null=" + (values == null)
                + " " + collectionName + "_count=" + (values == null ? "null" : values.size());
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }
}