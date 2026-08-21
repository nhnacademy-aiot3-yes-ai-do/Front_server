package site.yesaido.frontserver.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoResponse;

import java.util.List;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FrontResponseLoggingAspectTest {
    private final FrontResponseLoggingAspect aspect = new FrontResponseLoggingAspect();
    private final Logger logger = (Logger) LoggerFactory.getLogger(FrontResponseLoggingAspect.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Level originalLevel;

    @BeforeEach
    void setUp() {
        originalLevel = logger.getLevel();
        logger.setLevel(Level.INFO);
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        appender.stop();
        logger.setLevel(originalLevel);
    }

    @Test
    void logsSensorTypeCountAtControllerBoundary() throws Throwable {
        ResponseEntity<SensorTypeInfoListResponse> response = ResponseEntity.ok(
                new SensorTypeInfoListResponse(List.of(
                        new SensorTypeInfoResponse(1L, "TEMPERATURE", "C"),
                        new SensorTypeInfoResponse(2L, "HUMIDITY", "%")
                ))
        );

        aspect.logControllerResponse(joinPointReturning(response, "SensorController.getSensorTypes()"));

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_controller_response method=SensorController.getSensorTypes() status=200")
                        && message.contains("body_type=SensorTypeInfoListResponse")
                        && message.contains("body_null=false")
                        && message.contains("sensor_type_count=2")
        ));
    }

    @Test
    void logsSensorTypeCountAtClientReferenceBoundary() throws Throwable {
        ResponseEntity<SensorTypeInfoListResponse> response = ResponseEntity.ok(
                new SensorTypeInfoListResponse(List.of(new SensorTypeInfoResponse(1L, "TEMPERATURE", "C")))
        );

        aspect.logClientResponse(joinPointReturning(response, "SensorClient.getSensorTypes()"));

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_client_response method=SensorClient.getSensorTypes() status=200")
                        && message.contains("body_type=SensorTypeInfoListResponse")
                        && message.contains("body_null=false")
                        && message.contains("sensor_type_count=1")
        ));
    }

    @Test
    void logsRestControllerStringAsRegularResultInsteadOfView() throws Throwable {
        aspect.logControllerResponse(joinPointReturning(
                "plain-text-body",
                "RestStringController.body()",
                new RestStringController()
        ));

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_controller_response method=RestStringController.body()")
                        && message.contains("result_type=String")
                        && message.contains("result_null=false")
        ));
        assertFalse(appender.list.stream().map(ILoggingEvent::getFormattedMessage)
                .anyMatch(message -> message.contains("view=plain-text-body")));
    }

    @Test
    void logsResponseBodyStringFromMvcControllerAsRegularResultInsteadOfView() throws Throwable {
        ResponseBodyStringController target = new ResponseBodyStringController();
        aspect.logControllerResponse(joinPointReturning(
                "plain-text-body",
                "ResponseBodyStringController.body()",
                target,
                ResponseBodyStringController.class.getDeclaredMethod("body")
        ));

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_controller_response method=ResponseBodyStringController.body()")
                        && message.contains("result_type=String")
                        && message.contains("result_null=false")
        ));
        assertFalse(appender.list.stream().map(ILoggingEvent::getFormattedMessage)
                .anyMatch(message -> message.contains("view=plain-text-body")));
    }

    private ProceedingJoinPoint joinPointReturning(Object result, String method) throws Throwable {
        return joinPointReturning(result, method, null);
    }

    private ProceedingJoinPoint joinPointReturning(Object result, String method, Object target) throws Throwable {
        return joinPointReturning(result, method, target, null);
    }

    private ProceedingJoinPoint joinPointReturning(Object result, String method, Object target, Method targetMethod) throws Throwable {
        ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
        Signature signature = targetMethod == null ? mock(Signature.class) : mock(MethodSignature.class);
        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.toShortString()).thenReturn(method);
        if (targetMethod != null) {
            when(((MethodSignature) signature).getMethod()).thenReturn(targetMethod);
        }
        when(joinPoint.getTarget()).thenReturn(target);
        when(joinPoint.proceed()).thenReturn(result);
        return joinPoint;
    }

    @RestController
    private static class RestStringController {
        String body() {
            return "plain-text-body";
        }
    }

    @Controller
    private static class ResponseBodyStringController {
        @ResponseBody
        String body() {
            return "plain-text-body";
        }
    }
}
