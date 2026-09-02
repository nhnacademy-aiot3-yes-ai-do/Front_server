// src/main/java/site/yesaido/frontserver/controller/DashboardController.java
package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.yesaido.frontserver.util.LoginRequired;

@Controller
@LoginRequired
public class DashboardController {

    @GetMapping("/dashboard")
    public String mainDashboard() {
        return "forward:/react/index.html";
    }
}
