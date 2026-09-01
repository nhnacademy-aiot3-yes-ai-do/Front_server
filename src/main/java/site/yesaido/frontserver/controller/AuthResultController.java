package site.yesaido.frontserver.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.yesaido.frontserver.dto.react.AuthResultResponse;

@RestController
public class AuthResultController {
    public static final String AUTH_RESULT_SESSION_KEY = "reactAuthResult";

    @GetMapping("/auth/result")
    public ResponseEntity<AuthResultResponse> consume(HttpSession session) {
        Object result = session.getAttribute(AUTH_RESULT_SESSION_KEY);
        session.removeAttribute(AUTH_RESULT_SESSION_KEY);
        if (result instanceof AuthResultResponse authResult) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(authResult);
        }
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
