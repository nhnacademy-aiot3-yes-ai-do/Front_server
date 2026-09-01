package site.yesaido.frontserver.config;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ErrorPageAssetTest {

    private static final Path ERROR_TEMPLATE = Path.of("src/main/resources/templates/error.html");
    private static final Path ERROR_SCRIPT = Path.of("src/main/resources/static/js/error.js");
    private static final Path ERROR_IMAGE = Path.of("src/main/resources/static/images/errorperson.png");

    @Test
    void characterAndSporeAssetsAreLimitedToNonAdminErrorPages() throws IOException {
        String template = Files.readString(ERROR_TEMPLATE);

        assertTrue(template.contains("<script th:if=\"${!isAdmin}\" th:src=\"@{/js/error.js}\" defer></script>"));
        assertTrue(template.contains("<div class=\"error-character\" th:if=\"${!isAdmin}\">") ,
                "The character must not be rendered on admin error pages");
        assertTrue(template.contains("th:src=\"@{/images/errorperson.png}\""));
    }

    @Test
    void reducedMotionUsersDoNotReceiveAnimatedSporeNodes() throws IOException {
        String script = Files.readString(ERROR_SCRIPT);

        assertTrue(script.contains("matchMedia"), "The spore script must detect reduced-motion preference");
        assertTrue(script.contains("prefers-reduced-motion: reduce"),
                "The spore script must skip particle creation when motion is reduced");
    }

    @Test
    void errorCharacterImageIsSizedForItsRenderedUse() throws IOException {
        BufferedImage image = ImageIO.read(ERROR_IMAGE.toFile());

        assertTrue(image.getWidth() <= 512, "The error image should not exceed a 2x desktop render width");
        assertTrue(image.getHeight() <= 640, "The error image should not exceed a 2x desktop render height");
    }
}
