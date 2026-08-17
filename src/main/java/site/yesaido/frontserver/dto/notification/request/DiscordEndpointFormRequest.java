package site.yesaido.frontserver.dto.notification.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

public record DiscordEndpointFormRequest(
        @NotBlank(message = "Discord Webhook URL은 필수입니다.")
        @Size(max = 500, message = "Discord Webhook URL은 500자 이하여야 합니다.")
        String destination,

        @NotBlank(message = "알림 수신 경로 이름은 필수입니다.")
        @Size(max = 100, message = "알림 수신 경로 이름은 100자 이하여야 합니다.")
        String displayName
) {
    @AssertTrue(message = "허용되지 않은 Discord Webhook URL입니다.")
    public boolean isDestinationValid() {
        if (destination == null || destination.isBlank()) {
            return true;
        }

        try {
            URI uri = new URI(destination.trim());
            String host = uri.getHost();
            String path = uri.getPath();
            if (host == null || path == null) {
                return false;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            boolean discordHost = normalizedHost.equals("discord.com")
                    || normalizedHost.endsWith(".discord.com")
                    || normalizedHost.equals("discordapp.com")
                    || normalizedHost.endsWith(".discordapp.com");

            return "https".equalsIgnoreCase(uri.getScheme())
                    && discordHost
                    && uri.getUserInfo() == null
                    && path.startsWith("/api/webhooks/");
        } catch (URISyntaxException exception) {
            return false;
        }
    }
}
