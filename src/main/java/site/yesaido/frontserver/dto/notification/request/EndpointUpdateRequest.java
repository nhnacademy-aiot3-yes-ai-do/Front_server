package site.yesaido.frontserver.dto.notification.request;

public record EndpointUpdateRequest(
        String destination,
        String displayName
) {
}
