package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminController {

    @GetMapping("/admin")
    public String admin() {
        return "admin/index";
    }

    @GetMapping("/admin/members")
    public String members() {
        return "admin/members";
    }

    @GetMapping("/admin/cultivations")
    public String cultivations() {
        return "admin/cultivations";
    }

    @GetMapping("/admin/inquiries")
    public String inquiries() {
        return "admin/inquiries";
    }
}
