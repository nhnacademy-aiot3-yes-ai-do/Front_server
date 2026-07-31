package site.yesaido.frontserver.dto.cultivation.request;

import java.math.BigDecimal;

public record HarvestCreateRequest(BigDecimal harvestWeight, String memo) {
}
