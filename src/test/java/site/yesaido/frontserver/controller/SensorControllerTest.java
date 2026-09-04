package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.config.MethodOverrideConfig;
import site.yesaido.frontserver.dto.cultivation.request.cultivation.EnvironmentSettingRequest;
import site.yesaido.frontserver.dto.cultivation.request.sensor.CreateCultivationSensorRequest;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.CultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.ReusableCultivationSensorListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.ReusableCultivationSensorResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTrendPointListResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.SensorTypeInfoListResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = SensorController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc
@Import({AuthCookieProvider.class, MethodOverrideConfig.class})
class SensorControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SensorClient sensorClient;

    @MockitoBean
    private AiClient aiClient;

    @Test
    void getMushroomReferencesDelegatesToPublicSensorClient() throws Exception {
        when(sensorClient.getAllMushroomReferences())
                .thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/mushroom-references").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mushroomReferenceInfoResponses").isArray());

        verify(sensorClient).getAllMushroomReferences();
    }

    @Test
    void getMushroomReferencesDoesNotRelayUpstreamHeadersToBrowserResponse() throws Exception {
        when(sensorClient.getAllMushroomReferences())
                .thenReturn(ResponseEntity.ok()
                        .header("X-Upstream-Only", "must-not-reach-browser")
                        .body(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/mushroom-references").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Upstream-Only"))
                .andExpect(jsonPath("$.mushroomReferenceInfoResponses").isArray());
    }

    @Test
    void getSensorTypesDelegatesToSensorClient() throws Exception {
        when(sensorClient.getSensorTypes())
                .thenReturn(ResponseEntity.ok(new SensorTypeInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/sensor-types").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sensorTypeInfoResponses").isArray());

        verify(sensorClient).getSensorTypes();
    }

    @Test
    void getSensorTypesDoesNotRelayUpstreamHeadersToBrowserResponse() throws Exception {
        when(sensorClient.getSensorTypes())
                .thenReturn(ResponseEntity.ok()
                        .header("X-Upstream-Only", "must-not-reach-browser")
                        .body(new SensorTypeInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/sensor-types").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().doesNotExist("X-Upstream-Only"))
                .andExpect(jsonPath("$.sensorTypeInfoResponses").isArray());
    }

    @Test
    void getSensorsDelegatesWithCultivationId() throws Exception {
        when(sensorClient.getSensors(10L))
                .thenReturn(ResponseEntity.ok(new CultivationSensorListResponse(List.of(), List.of())));

        mockMvc.perform(get("/cultivations/{cultivation-id}/sensors", 10L).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sensors").isArray())
                .andExpect(jsonPath("$.environmentSettings").isArray());

        verify(sensorClient).getSensors(10L);
    }

    @Test
    void getSensorsDoesNotRelayUpstreamHeadersToBrowserResponse() throws Exception {
        when(sensorClient.getSensors(10L))
                .thenReturn(ResponseEntity.ok()
                        .header("X-Upstream-Only", "must-not-reach-browser")
                        .body(new CultivationSensorListResponse(List.of(), List.of())));

        mockMvc.perform(get("/cultivations/{cultivation-id}/sensors", 10L).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Upstream-Only"))
                .andExpect(jsonPath("$.sensors").isArray());
    }

    @Test
    void getReusableSensorsDelegatesExcludedCultivationId() throws Exception {
        ReusableCultivationSensorResponse sensor = new ReusableCultivationSensorResponse(
                4L, "EUI-001", "MODEL-A", "온습도 센서", "광주", "1번 선반", List.of()
        );
        when(sensorClient.getReusableSensors(10L))
                .thenReturn(ResponseEntity.ok(
                        new ReusableCultivationSensorListResponse(List.of(sensor))
                ));

        mockMvc.perform(get("/cultivations/reusable-sensors")
                        .cookie(LOGGED_IN)
                        .param("exclude-cultivation-id", "10"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sensors[0].deviceEui").value("EUI-001"));

        verify(sensorClient).getReusableSensors(10L);
    }

    @Test
    void getSensorTrendDelegatesQueryParametersAndReturnsJson() throws Exception {
        SensorTrendPointListResponse trend = new SensorTrendPointListResponse(
                10L, "device-eui", "temperature", "°C", List.of()
        );
        when(sensorClient.getSensorTrend(10L, "device-eui", "temperature"))
                .thenReturn(ResponseEntity.ok(trend));

        mockMvc.perform(get("/cultivations/{cultivation-id}/sensor-values/trend", 10L)
                        .cookie(LOGGED_IN)
                        .param("device-eui", "device-eui")
                        .param("sensor-type", "temperature"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(jsonPath("$.cultivationId").value(10))
                .andExpect(jsonPath("$.deviceEui").value("device-eui"))
                .andExpect(jsonPath("$.sensorType").value("temperature"));

        verify(sensorClient).getSensorTrend(10L, "device-eui", "temperature");
    }

    @Test
    void registerSensorDelegatesRequestAndPreservesNoContentStatus() throws Exception {
        CreateCultivationSensorRequest request = new CreateCultivationSensorRequest(
                "device-eui", "model", "name", "location", "detail", List.of()
        );
        when(sensorClient.registerSensor(eq(10L), any(CreateCultivationSensorRequest.class)))
                .thenReturn(ResponseEntity.noContent().build());

        mockMvc.perform(post("/cultivations/{cultivation-id}/sensors", 10L)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(sensorClient).registerSensor(10L, request);
    }

    @Test
    void deleteSensorDelegatesIdsAndPreservesNoContentStatus() throws Exception {
        when(sensorClient.deleteSensor(10L, 20L)).thenReturn(ResponseEntity.noContent().build());

        mockMvc.perform(delete("/cultivations/{cultivation-id}/sensors/{sensor-id}", 10L, 20L)
                        .cookie(LOGGED_IN))
                .andExpect(status().isNoContent());

        verify(sensorClient).deleteSensor(10L, 20L);
    }

    @Test
    void updateEnvironmentSettingDelegatesRequestAndPreservesNoContentStatus() throws Exception {
        EnvironmentSettingRequest request = new EnvironmentSettingRequest(
                3L,
                new BigDecimal("19.0"),
                new BigDecimal("25.0")
        );
        when(sensorClient.updateEnvironmentSetting(eq(10L), any(EnvironmentSettingRequest.class)))
                .thenReturn(ResponseEntity.noContent().build());

        mockMvc.perform(put("/cultivations/{cultivation-id}/environment-settings", 10L)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(sensorClient).updateEnvironmentSetting(10L, request);
    }

    @Test
    void hiddenMethodOverrideRoutesFormPostToSensorDelete() throws Exception {
        when(sensorClient.deleteSensor(10L, 20L)).thenReturn(ResponseEntity.noContent().build());

        mockMvc.perform(post("/cultivations/{cultivation-id}/sensors/{sensor-id}", 10L, 20L)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("_method", "DELETE"))
                .andExpect(status().isNoContent());

        verify(sensorClient).deleteSensor(10L, 20L);
    }

}
