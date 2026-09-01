package site.yesaido.frontserver.dto.notification.response;

import java.util.List;

public record ChannelTypeListResponse(
        List<ChannelTypeResponse> channelTypeResponses
) {}
