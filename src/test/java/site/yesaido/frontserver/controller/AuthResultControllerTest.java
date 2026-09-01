package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;
import site.yesaido.frontserver.dto.react.AuthResultResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AuthResultControllerTest {
    private final AuthResultController controller = new AuthResultController();

    @Test
    @DisplayName("인증 결과는 한 번만 반환하고 세션에서 제거한다")
    void consumeReturnsResultOnlyOnce() {
        MockHttpSession session = new MockHttpSession();
        AuthResultResponse expected = new AuthResultResponse("success", "완료되었습니다.");
        session.setAttribute(AuthResultController.AUTH_RESULT_SESSION_KEY, expected);

        ResponseEntity<AuthResultResponse> first = controller.consume(session);
        ResponseEntity<AuthResultResponse> second = controller.consume(session);

        assertEquals(HttpStatus.OK, first.getStatusCode());
        assertEquals(expected, first.getBody());
        assertEquals("no-store", first.getHeaders().getCacheControl());
        assertEquals(HttpStatus.NO_CONTENT, second.getStatusCode());
        assertNull(second.getBody());
    }
}
