package site.yesaido.frontserver.dto.notification.response;

public record ChannelTypeResponse(
        Long id,
        String code,
        String displayName,
        boolean deleted) {
}
