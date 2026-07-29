// src/main/java/site/yesaido/frontserver/controller/DashboardController.java
package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @GetMapping("/dashboard")
    public String mainDashboard() {
        return "dashboard/main";
    }
}