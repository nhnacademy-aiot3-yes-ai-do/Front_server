package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CultivationCreateAjaxTemplateTest {

    private static final Path TEMPLATE = Path.of("src/main/resources/templates/cultivation/create.html");
    private static final Path CREATE_SCRIPT = Path.of("src/main/resources/static/js/cultivation-create.js");

    @Test
    void createPageSubmitsCultivationAsJsonWithEnvironmentSettings() throws IOException {
        String template = Files.readString(TEMPLATE);
        String createScript = Files.readString(CREATE_SCRIPT);

        assertTrue(template.contains("<form id=\"cultivation-create-form\" class=\"wizard-panels\">"));
        assertTrue(template.contains("id=\"cultivation-submit\" type=\"submit\""));
        assertFalse(template.contains("method=\"post\""));

        assertTrue(createScript.contains("form.addEventListener('submit'"));
        assertTrue(createScript.contains("event.preventDefault();"));
        assertTrue(createScript.contains("environmentSettingRequests: environmentSettings.map("));
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
}
