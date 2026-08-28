package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CultivationCreateAjaxTemplateTest {

    private static final Path TEMPLATE = Path.of("src/main/resources/templates/cultivation/create.html");
    private static final Path CREATE_SCRIPT = Path.of(
            "src/main/resources/static/js/cultivation/cultivation-create.js"
    );
    private static final Path CREATE_STYLE = Path.of(
            "src/main/resources/static/css/cultivation-create.css"
    );

    @Test
    void createPageSubmitsCultivationAsJsonWithEnvironmentSettings() throws IOException {
        String template = Files.readString(TEMPLATE);
        String createScript = Files.readString(CREATE_SCRIPT);

        assertTrue(template.contains("<form id=\"cultivation-create-form\" class=\"wizard-panels\">"));
        assertTrue(template.contains("id=\"cultivation-submit\" type=\"submit\""));
        assertTrue(template.contains("@{/js/cultivation/cultivation-create.js"));
        assertFalse(template.contains("method=\"post\""));

        assertTrue(createScript.contains("form.addEventListener('submit'"));
        assertTrue(createScript.contains("event.preventDefault();"));
        assertTrue(createScript.contains("environmentSettingRequests: environmentSettings.map("));
        assertTrue(createScript.contains("setting.thresholdMin > setting.thresholdMax"));
        assertFalse(createScript.contains("setting.thresholdMin >= setting.thresholdMax"));
        assertTrue(createScript.contains("fetch('/cultivations'"));
        assertTrue(createScript.contains("'Content-Type': 'application/json'"));
        assertTrue(createScript.contains("body: JSON.stringify(request)"));
    }

    @Test
    void aiGuideAndCultivationConditionAreRenderedTogether() throws IOException {
        String createScript = Files.readString(CREATE_SCRIPT);

        assertTrue(createScript.contains("renderMushroomInfo(guide);"));
        assertTrue(createScript.contains("guide ? guide.cultivationCondition : null"));
    }

    @Test
    void disabledSubmitButtonHasDistinctVisualStyle() throws IOException {
        String createStyle = Files.readString(CREATE_STYLE);

        assertTrue(createStyle.contains("#cultivation-submit:disabled"));
        assertTrue(createStyle.contains("cursor: not-allowed;"));
        assertTrue(createStyle.contains("box-shadow: none;"));
        assertTrue(createStyle.contains("#cultivation-submit:disabled:hover"));
    }

    @Test
    void environmentSettingsUseResponsiveStyledControls() throws IOException {
        String template = Files.readString(TEMPLATE);
        String createScript = Files.readString(CREATE_SCRIPT);
        String createStyle = Files.readString(CREATE_STYLE);

        assertTrue(template.contains("class=\"toggle-switch environment-setting-toggle\""));
        assertTrue(template.contains("class=\"toggle-track\""));
        assertTrue(template.contains("class=\"toggle-thumb\""));
        assertTrue(createScript.contains("label.className = 'environment-setting-label';"));
        assertTrue(createScript.contains("range.className = 'environment-setting-range';"));
        assertTrue(createScript.contains("minInput.className = 'environment-setting-input';"));
        assertTrue(createStyle.contains(".environment-setting-header"));
        assertTrue(createStyle.contains("#environment-settings"));
        assertTrue(createStyle.contains(".environment-setting-row"));
        assertTrue(createStyle.contains("grid-template-columns: repeat(2, minmax(0, 1fr));"));
    }
}
