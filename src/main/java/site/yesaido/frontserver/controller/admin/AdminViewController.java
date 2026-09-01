package site.yesaido.frontserver.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired(adminOnly = true)
public class AdminViewController {
    private static final String REACT_APP = "forward:/react/index.html";

    @GetMapping({
            "/admin",
            "/admin/members",
            "/admin/inquiries",
            "/admin/mushrooms",
            "/admin/sensors",
            "/admin/notification-events"
    })
    public String adminApp() {
        return REACT_APP;
    }
}
