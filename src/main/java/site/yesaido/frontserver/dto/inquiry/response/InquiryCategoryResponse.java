package site.yesaido.frontserver.dto.inquiry.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InquiryCategoryResponse(
        Long id,
        String categoryName
) {
}
