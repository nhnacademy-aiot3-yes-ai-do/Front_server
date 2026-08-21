package site.yesaido.frontserver.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SensorBffCompletionLoggingInterceptorTest {
    private final SensorBffCompletionLoggingInterceptor interceptor = new SensorBffCompletionLoggingInterceptor();
    private final Logger logger = (Logger) LoggerFactory.getLogger(SensorBffCompletionLoggingInterceptor.class);
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
    void logsFinalStatusAndExceptionTypeForSensorBffRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations/sensor-types");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(500);
        Object handler = new Object();

        interceptor.preHandle(request, response, handler);
        interceptor.afterCompletion(request, response, handler, new IllegalStateException("ignored"));

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_bff_completion endpoint=sensor-types status=500")
                        && message.contains("handler=Object")
                        && message.contains("exception_type=IllegalStateException")
                        && !message.contains("ignored")
        ));
    }

    @Test
    void doesNotLogUnrelatedRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations");
        MockHttpServletResponse response = new MockHttpServletResponse();

        interceptor.preHandle(request, response, new Object());
        interceptor.afterCompletion(request, response, new Object(), null);

        assertTrue(appender.list.isEmpty());
    }
}
