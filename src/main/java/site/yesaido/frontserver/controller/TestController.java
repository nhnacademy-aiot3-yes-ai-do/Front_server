package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import site.yesaido.frontserver.client.TestClient;
import site.yesaido.frontserver.dto.test.AdminBookMetaData;
import site.yesaido.frontserver.dto.test.BookAdminResponseDTO;
import site.yesaido.frontserver.dto.test.TotalDataRespDTO;

@RequiredArgsConstructor
@Controller
@RequestMapping("/test")
public class TestController {
    private final TestClient testClient;

    @GetMapping
    public String getTest(@PageableDefault(size = 15, sort = "publication_date", direction = Sort.Direction.DESC) Pageable pageable,
                          Model model) {
        AdminBookMetaData bookAdminPageInfo = testClient.getBookAdminPageInfo(pageable);

        TotalDataRespDTO totalData = bookAdminPageInfo.totalDate();
        model.addAttribute("totalCount", totalData.totalCount());
        model.addAttribute("soldOutCount", totalData.soldOutCount());
        model.addAttribute("newReviewCount", totalData.newReviewCount());
        model.addAttribute("categoryCount", totalData.categoryCount());

        Page<BookAdminResponseDTO> bookPage = bookAdminPageInfo.bookAdminResponseDTOS();
        model.addAttribute("books", bookPage.getContent());
        return "test/test";
    }
}
