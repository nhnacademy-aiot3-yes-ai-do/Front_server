package site.yesaido.frontserver.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import site.yesaido.frontserver.client.SensorClient;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "feign.client.gateway.url=http://127.0.0.1:1")
class FrontResponseLoggingAspectClientIntegrationTest {
    @Autowired
    private SensorClient sensorClient;

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
    void logsClientReferenceFailureWhenGatewayCannotBeReached() {
        assertThrows(RuntimeException.class, () -> sensorClient.getSensorTypes());

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_client_response method=SensorClient.getSensorTypes()")
                        && message.contains("outcome=exception")
                        && message.contains("error_type=")
        ));
    }
}
