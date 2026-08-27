package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MushroomReferenceThresholdRangeValidator
        implements ConstraintValidator<ValidMushroomReferenceThreshold, MushroomReferenceThresholdRequest> {

    @Override
    public boolean isValid(MushroomReferenceThresholdRequest request, ConstraintValidatorContext context) {
        if (request == null || request.thresholdMin() == null || request.thresholdMax() == null) {
            return true;
        }
        return request.thresholdMin().compareTo(request.thresholdMax()) <= 0;
    }
}
