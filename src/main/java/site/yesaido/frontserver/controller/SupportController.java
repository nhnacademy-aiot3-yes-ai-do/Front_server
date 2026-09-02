package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
public class SupportController {

    @GetMapping("/support")
    @LoginRequired
    public String support() {
        return "forward:/react/index.html";
    }
}
