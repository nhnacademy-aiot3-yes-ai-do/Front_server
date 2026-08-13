package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired(adminOnly = true)
public class             AdminController {

    @GetMapping("/admin")
    public String admin() {
        return "admin/index";
    }

    @GetMapping("/admin/members")
    public String members() {
        return "admin/members";
    }

    @GetMapping("/admin/inquiries")
    public String inquiries() {
        return "admin/inquiries";
    }

    @GetMapping("/admin/mushrooms")
    public String mushrooms() {
        return "admin/mushrooms";
    }
}
