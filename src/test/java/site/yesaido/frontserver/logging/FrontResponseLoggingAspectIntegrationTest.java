package site.yesaido.frontserver.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class FrontResponseLoggingAspectIntegrationTest {
    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
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
    void logsControllerBoundaryForSensorTypeBffRequest() throws Exception {
        when(sensorClient.getSensorTypes()).thenReturn(ResponseEntity.ok(
                new SensorTypeInfoListResponse(List.of(
                        new SensorTypeInfoResponse(1L, "TEMPERATURE", "C"),
                        new SensorTypeInfoResponse(2L, "HUMIDITY", "%")
                ))
        ));

        mockMvc.perform(get("/cultivations/sensor-types").cookie(LOGGED_IN))
                .andExpect(status().isOk());

        assertTrue(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(message ->
                message.contains("front_controller_response method=SensorController.getSensorTypes() status=200")
                        && message.contains("sensor_type_count=2")
        ));
    }
}
