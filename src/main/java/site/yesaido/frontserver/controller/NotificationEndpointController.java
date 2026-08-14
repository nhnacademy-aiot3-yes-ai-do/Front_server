package site.yesaido.frontserver.controller;

import feign.FeignException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
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
import java.util.Map;

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
    public ResponseEntity<?> createDiscordEndpoint(@Valid @RequestBody DiscordEndpointFormRequest form) {
        EndpointCreateRequest request = new EndpointCreateRequest(
                discordChannelTypeId, form.destination().trim(), form.displayName().trim());
        try {
            return notificationClient.createEndpoint(request);
        } catch (FeignException exception) {
            return feignError(exception);
        }
    }

    @PatchMapping("/{endpointId}")
    public ResponseEntity<?> updateDiscordEndpoint(
            @PathVariable Long endpointId,
            @Valid @RequestBody DiscordEndpointFormRequest form
    ) {
        EndpointUpdateRequest request = new EndpointUpdateRequest(
                form.destination().trim(), form.displayName().trim());
        try {
            return notificationClient.updateEndpoint(endpointId, request);
        } catch (FeignException exception) {
            return feignError(exception);
        }
    }

    @DeleteMapping("/{endpointId}")
    public ResponseEntity<?> deleteEndpoint(@PathVariable Long endpointId) {
        try {
            notificationClient.deleteEndpoint(endpointId);
            return ResponseEntity.noContent().build();
        } catch (FeignException exception) {
            return feignError(exception);
        }
    }

    private static ResponseEntity<Object> feignError(FeignException exception) {
        int status = exception.status() > 0 ? exception.status() : 502;
        String body = exception.contentUTF8();
        if (body == null || body.isBlank()) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("detail", "알림 서버 요청에 실패했습니다."));
        }
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }
}
