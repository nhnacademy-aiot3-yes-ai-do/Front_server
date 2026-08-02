package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
public class HomeController {

    @LoginRequired
    @GetMapping("/")
    public String home(@CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return "redirect:/login";
        }
        return "redirect:/cultivations";
    }
}
