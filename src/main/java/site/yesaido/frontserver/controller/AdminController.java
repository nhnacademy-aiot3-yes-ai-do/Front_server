package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired(adminOnly = true)
@RequiredArgsConstructor
public class AdminController {

    @GetMapping("/admin")
    public String admin() {
        return "admin/index";
    }

    @GetMapping("/admin/members")
    public String members() {
        return "admin/members";
    }

    // 문의사항 용
    @GetMapping("/admin/inquiries")
    public String inquiries() {
        return "admin/inquiries";
    }

    // 버섯 등록
    @GetMapping("/admin/mushrooms")
    public String mushrooms() {
        return "admin/mushrooms";
    }
}