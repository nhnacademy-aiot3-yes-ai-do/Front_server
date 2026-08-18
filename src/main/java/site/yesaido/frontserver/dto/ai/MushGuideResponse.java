package site.yesaido.frontserver.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MushGuideResponse(
        Long mushroomId,
        String mushroomName,
        AiEvaluationDto evaluation,
        String summary,
        String caution,
        String tip,
        EnvironmentConditionInfo cultivationCondition,
        EnvironmentConditionInfo harvestCondition,
        List<RecipeDto> recipes
) {
}
