package site.yesaido.frontserver.dto.cultivation.request.cultivation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record EnvironmentSettingRequest(
        @NotNull(message = "센서 타입을 선택해주세요.")
        @Positive(message = "센서 타입 ID가 올바르지 않습니다.")
        Long sensorTypeId,

        @NotNull(message = "최소값을 입력해주세요.")
        BigDecimal thresholdMin,

        @NotNull(message = "최대값을 입력해주세요.")
        BigDecimal thresholdMax
) {
}
