package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CultivationController {

    @GetMapping("/cultivations/new")
    public String createCultivation() {
        return "cultivation/create";
    }
}