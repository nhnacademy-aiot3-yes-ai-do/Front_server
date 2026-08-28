package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MushroomReferenceThresholdRangeValidatorTest {
    private final MushroomReferenceThresholdRangeValidator validator = new MushroomReferenceThresholdRangeValidator();

    @Test
    void rejectsThresholdWithoutBothBounds() {
        MushroomReferenceThresholdRequest request = new MushroomReferenceThresholdRequest(
                null, 1L, "GROWTH", new BigDecimal("10"), null
        );

        assertThat(validator.isValid(request, null)).isFalse();
    }
}
