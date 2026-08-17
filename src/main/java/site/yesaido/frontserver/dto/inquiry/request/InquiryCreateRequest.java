package site.yesaido.frontserver.dto.inquiry.request;

public record InquiryCreateRequest(
        Long categoryId,
        String title,
        String content,
        Long cultivationId
) {
}
