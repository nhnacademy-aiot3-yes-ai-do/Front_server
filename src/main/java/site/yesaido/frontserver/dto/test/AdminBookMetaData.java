package site.yesaido.frontserver.dto.test;

import org.springframework.data.domain.Page;

public record AdminBookMetaData(
        Page<BookAdminResponseDTO> bookAdminResponseDTOS,
        TotalDataRespDTO totalDate
) {
}