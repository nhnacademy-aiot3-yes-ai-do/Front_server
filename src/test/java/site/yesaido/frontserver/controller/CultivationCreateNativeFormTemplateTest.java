package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CultivationCreateNativeFormTemplateTest {

    private static final Path TEMPLATE = Path.of("src/main/resources/templates/cultivation/create.html");
    private static final Path CREATE_SCRIPT = Path.of("src/main/resources/static/js/cultivation-create.js");

    @Test
    void createPageSubmitsCultivationThroughNativeHtmlForm() throws IOException {
        String template = Files.readString(TEMPLATE);
        String createScript = Files.readString(CREATE_SCRIPT);

        assertTrue(template.contains("<form class=\"wizard-panels\" method=\"post\" th:action=\"@{/cultivations}\">"));
        assertTrue(template.contains("id=\"f-name\" name=\"name\" required"));
        assertTrue(template.contains("<select id=\"f-mushroom\" name=\"mushroomId\" required></select>"));
        assertTrue(template.contains("id=\"cultivation-submit\" type=\"submit\""));
        assertFalse(template.contains("onclick=\"finishCultivation()\""));
        assertFalse(createScript.contains("function finishCultivation()"));
    }
}
