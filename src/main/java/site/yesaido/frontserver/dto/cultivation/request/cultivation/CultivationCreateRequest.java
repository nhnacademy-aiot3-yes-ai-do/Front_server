package site.yesaido.frontserver.dto.cultivation.request.cultivation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CultivationCreateRequest(
    @NotBlank(message = "재배지 이름을 입력해주세요.")
    @Size(max = 100, message = "재배지 이름은 100자를 넘을 수 없습니다.")
    String name,

    @NotNull(message = "버섯 종류를 선택해주세요.")
    Long mushroomId
) {
}
