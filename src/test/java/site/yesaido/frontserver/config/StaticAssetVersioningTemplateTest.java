package site.yesaido.frontserver.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;


class StaticAssetVersioningTemplateTest {

    private static final Path TEMPLATE_DIRECTORY = Path.of("src/main/resources/templates");

    @Test
    void templatesUseThymeleafResourceUrlsForInternalJavaScriptAndStylesheets() throws IOException {
        List<String> unconscionableReferences;
        try (Stream<Path> paths = Files.walk(TEMPLATE_DIRECTORY)) {
            unconscionableReferences = paths
                    .filter(path -> path.toString().endsWith(".html"))
                    .flatMap(this::rawInternalAssetReferences)
                    .toList();
        }

        assertEquals(List.of(), unconscionableReferences,
                "Internal /js and /css resources must use th:src or th:href so Spring can emit a content-versioned URL");
    }


    private Stream<String> rawInternalAssetReferences(Path template) {
        try {
            return Files.readAllLines(template).stream()
                    .map(String::trim)
                    .filter(this::hasRawInternalAssetReference)
                    .map(line -> template + ": " + line);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read template " + template, exception);
        }
    }

    private boolean hasRawInternalAssetReference(String line) {
        return (line.contains("<script") && line.contains("src=\"/js/"))
                || (line.contains("<link") && line.contains("href=\"/css/"));
    }
}
