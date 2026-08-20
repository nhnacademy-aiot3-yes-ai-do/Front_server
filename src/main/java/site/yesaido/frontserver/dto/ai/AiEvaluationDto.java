package site.yesaido.frontserver.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiEvaluationDto(
        int difficultyLevel,
        int growthSpeed,
        String sensitivity,
        String aiStrategy
) {
}
