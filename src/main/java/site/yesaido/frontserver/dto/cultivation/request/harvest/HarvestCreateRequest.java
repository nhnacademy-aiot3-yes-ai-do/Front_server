package site.yesaido.frontserver.dto.cultivation.request.harvest;

import java.math.BigDecimal;

public record HarvestCreateRequest(BigDecimal harvestWeight, String memo) {
}
