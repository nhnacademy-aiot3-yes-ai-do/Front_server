package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home(@CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return "redirect:/login";
        }
        return "cultivation/list";
    }
}
