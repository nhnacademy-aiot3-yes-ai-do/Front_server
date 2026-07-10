package site.yesaido.frontserver.dto.test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BookAdminResponseDTO(
        long bookId,
        String isbn,
        String title,
        List<ImageRespDTO> imageList,
        Long price,
        BigDecimal discountPercentage,
        Long discountPrice,
        int stock,
        Status status,
        String publisher,
        LocalDate publicationDate
) {
}