package site.yesaido.frontserver.dto.cultivation.request.mushroom;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = MushroomReferenceThresholdRangeValidator.class)
public @interface ValidMushroomReferenceThreshold {
    String message() default "thresholdMin은 thresholdMax보다 클 수 없습니다.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
