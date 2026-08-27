package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;

public class MushroomReferenceThresholdRangeValidator
        implements ConstraintValidator<ValidMushroomReferenceThreshold, MushroomReferenceThresholdRequest> {

    @Override
    public boolean isValid(MushroomReferenceThresholdRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true;
        }

        BigDecimal thresholdMin = request.thresholdMin();
        BigDecimal thresholdMax = request.thresholdMax();
        return thresholdMin != null
                && thresholdMax != null
                && thresholdMin.compareTo(thresholdMax) <= 0;
    }
}
