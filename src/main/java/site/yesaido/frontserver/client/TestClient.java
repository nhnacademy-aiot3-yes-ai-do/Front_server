package site.yesaido.frontserver.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.data.web.PageableDefault;
import site.yesaido.frontserver.dto.test.AdminBookMetaData;

@FeignClient(name = "book-service2", path = "/api/v2/books", url = "${feign.client.gateway.url}")
public interface TestClient {
    @GetMapping("/admin")
    public AdminBookMetaData getBookAdminPageInfo(@PageableDefault(size = 15, sort = "publication_date", direction = Sort.Direction.DESC) Pageable pageable);
}
