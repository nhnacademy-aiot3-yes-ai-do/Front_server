package site.yesaido.frontserver.dto.notification.request;

public record EndpointCreateRequest(
        Long channelTypeId,
        String destination,
        String displayName
) {
}
