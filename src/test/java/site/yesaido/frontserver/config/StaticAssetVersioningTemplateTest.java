package site.yesaido.frontserver.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;


class StaticAssetVersioningTemplateTest {

    private static final Path TEMPLATE_DIRECTORY = Path.of("src/main/resources/templates");
    private static final Pattern HTML_TAG = Pattern.compile("<(script|link)\\b[^>]*>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern INTERNAL_ASSET_ATTRIBUTE = Pattern.compile(
            "(?<![A-Za-z0-9_:-])(src|href)\\s*=\\s*['\"]/(js|css)/[^'\"]*['\"]", Pattern.CASE_INSENSITIVE);

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

    @Test
    void ignoresDataAttributesThatAreNotBrowserResourceReferences() {
        assertFalse(hasRawInternalAssetReference("<script data-src=\"/js/app.js\"></script>"));
        assertFalse(hasRawInternalAssetReference("<link data-href='/css/style.css'>"));
    }


    private Stream<String> rawInternalAssetReferences(Path template) {
        try {
            String templateContent = Files.readString(template);
            return HTML_TAG.matcher(templateContent).results()
                    .map(MatchResult::group)
                    .filter(this::hasRawInternalAssetReference)
                    .map(tag -> template + ": " + tag);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read template " + template, exception);
        }
    }

    private boolean hasRawInternalAssetReference(String tag) {
        Matcher tagMatcher = HTML_TAG.matcher(tag);
        if (!tagMatcher.matches()) {
            return false;
        }

        Matcher attributeMatcher = INTERNAL_ASSET_ATTRIBUTE.matcher(tag);
        while (attributeMatcher.find()) {
            String tagName = tagMatcher.group(1);
            String attributeName = attributeMatcher.group(1);
            String assetDirectory = attributeMatcher.group(2);
            if (("script".equalsIgnoreCase(tagName) && "src".equalsIgnoreCase(attributeName) && "js".equalsIgnoreCase(assetDirectory))
                    || ("link".equalsIgnoreCase(tagName) && "href".equalsIgnoreCase(attributeName) && "css".equalsIgnoreCase(assetDirectory))) {
                return true;
            }
        }
        return false;
    }
}
