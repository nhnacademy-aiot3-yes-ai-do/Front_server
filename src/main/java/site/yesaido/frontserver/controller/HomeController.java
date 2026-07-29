package site.yesaido.frontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;

// TODO: 백엔드 연동 준비가 되면 accessToken 쿠키 유효성 검증(만료/위조 체크)을 실제로 붙여야 합니다.
//       지금은 로그인 시 서버가 accessToken 쿠키를 내려준다는 전제로, 쿠키 존재 여부만으로
//       로그인 상태를 판단하는 단순화된 버전입니다.
@Controller
public class HomeController {

    @GetMapping("/")
    public String home(@CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return "redirect:/login";
        }
        return "cultivation/list";
    }
}
