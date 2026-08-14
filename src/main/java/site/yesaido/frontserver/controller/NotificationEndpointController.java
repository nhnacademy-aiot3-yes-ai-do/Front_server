package site.yesaido.frontserver.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.client.NotificationClient;
import site.yesaido.frontserver.dto.notification.request.DiscordEndpointFormRequest;
import site.yesaido.frontserver.dto.notification.request.EndpointCreateRequest;
import site.yesaido.frontserver.dto.notification.request.EndpointUpdateRequest;
import site.yesaido.frontserver.dto.notification.response.EndpointResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@LoginRequired
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications/endpoints")
public class NotificationEndpointController {

    private final NotificationClient notificationClient;

    @Value("${notification.discord.channel-type-id:2}")
    private long discordChannelTypeId;

    @GetMapping
    public ResponseEntity<List<EndpointResponse>> listEndpoints() {
        return notificationClient.getEndpoints();
    }

    @PostMapping
    public ResponseEntity<EndpointResponse> createDiscordEndpoint(
            @Valid @RequestBody DiscordEndpointFormRequest form
    ) {
        EndpointCreateRequest request = new EndpointCreateRequest(
                discordChannelTypeId, form.destination().trim(), form.displayName().trim());
        return notificationClient.createEndpoint(request);
    }

    @PatchMapping("/{endpointId}")
    public ResponseEntity<EndpointResponse> updateDiscordEndpoint(
            @PathVariable Long endpointId,
            @Valid @RequestBody DiscordEndpointFormRequest form
    ) {
        EndpointUpdateRequest request = new EndpointUpdateRequest(
                form.destination().trim(), form.displayName().trim());
        return notificationClient.updateEndpoint(endpointId, request);
    }

    @DeleteMapping("/{endpointId}")
    public ResponseEntity<Void> deleteEndpoint(@PathVariable Long endpointId) {
        notificationClient.deleteEndpoint(endpointId);
        return ResponseEntity.noContent().build();
    }
}
