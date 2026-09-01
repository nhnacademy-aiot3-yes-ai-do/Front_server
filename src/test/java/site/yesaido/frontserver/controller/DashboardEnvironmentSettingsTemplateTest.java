package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DashboardEnvironmentSettingsTemplateTest {

    private static final Path TEMPLATE = Path.of("src/main/resources/templates/dashboard/main.html");
    private static final Path DASHBOARD_SCRIPT = Path.of("src/main/resources/static/js/dashboard.js");
    private static final Path DASHBOARD_STYLE = Path.of("src/main/resources/static/css/dashboard.css");

    @Test
    void environmentSettingsModalUsesDynamicLockedControls() throws IOException {
        String template = Files.readString(TEMPLATE);

        assertTrue(template.contains("onclick=\"openEnvironmentSettingsModal()\""));
        assertTrue(template.contains("id=\"settings-sensor-select\""));
        assertTrue(template.contains("id=\"settings-threshold-min\""));
        assertTrue(template.contains("id=\"settings-threshold-max\""));
        assertTrue(template.contains("id=\"settings-threshold-min-unit\""));
        assertTrue(template.contains("id=\"settings-threshold-max-unit\""));
        assertTrue(template.contains("id=\"settings-recommendation\""));
        assertTrue(template.contains("id=\"settings-warning\""));
        assertTrue(template.contains("id=\"settings-error\""));
        assertTrue(template.contains("id=\"settings-edit-btn\""));
        assertTrue(template.contains("id=\"settings-cancel-btn\""));
        assertTrue(template.contains("id=\"settings-save-btn\""));
        assertTrue(template.contains("var MUSHROOM_NAME ="));

        assertFalse(template.contains("온도센서3"));
        assertFalse(template.contains("value=\"365\""));
    }

    @Test
    void scriptIntersectsRegisteredTypesAndPersistsWithTwoStepWarning() throws IOException {
        String template = Files.readString(TEMPLATE);
        String script = Files.readString(DASHBOARD_SCRIPT);

        assertTrue(script.contains("function availableEnvironmentSettings(payload)"));
        assertTrue(script.contains("payload.environmentSettings"));
        assertTrue(script.contains("sensor.sensorTypes"));
        assertTrue(script.contains("setting.valueUnit"));
        assertTrue(script.contains("thresholdMin > thresholdMax"));
        assertFalse(script.contains("thresholdMin >= thresholdMax"));
        assertTrue(script.contains("'/sensor-validation'"));
        assertTrue(script.contains("AI 권장값을 불러올 수 없습니다."));
        assertTrue(script.contains("권장 재배 환경을 벗어난 설정입니다. 작물의 생육 상태와 수확 결과가 예상과 달라질 수 있습니다. 계속하시겠습니까?"));
        assertTrue(script.contains("pendingThresholdConfirmation"));
        assertTrue(script.contains("method: 'PUT'"));
        assertTrue(script.contains("'/environment-settings'"));
        assertTrue(script.contains("window.location.reload()"));
        assertTrue(template.contains("현재 경작지에 설정 가능한 센서가 없습니다."));
    }

    @Test
    void styleDistinguishesLockedEditingWarningAndErrorStates() throws IOException {
        String style = Files.readString(DASHBOARD_STYLE);

        assertTrue(style.contains(".settings-threshold-field input:disabled"));
        assertTrue(style.contains(".settings-config-col.is-editing"));
        assertTrue(style.contains(".settings-actions .btn[hidden]"));
        assertTrue(style.contains(".settings-warning.is-visible"));
        assertTrue(style.contains(".settings-error.is-visible"));
        assertTrue(style.contains(".settings-empty-state"));
    }
}
