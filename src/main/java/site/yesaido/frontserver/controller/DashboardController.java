// src/main/java/site/yesaido/frontserver/controller/DashboardController.java
package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// TODO: 실제 재배지 데이터/센서 데이터 연동 전까지는 화면 확인용으로 단순 라우팅만 합니다.
@Controller
public class DashboardController {

    @GetMapping("/dashboard")
    public String mainDashboard() {
        return "dashboard/main";
    }
}