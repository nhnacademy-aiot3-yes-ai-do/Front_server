package site.yesaido.frontserver.exception;

import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.ModelAndView;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BrowserErrorViewResolverTest {

    @Test
    void rendersTheSharedErrorViewUsingTheOriginalRequestUri() {
        BrowserErrorViewResolver resolver = new BrowserErrorViewResolver();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/error");
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/cultivations/42");

        ModelAndView result = resolver.resolveErrorView(
                request,
                HttpStatus.INTERNAL_SERVER_ERROR,
                Map.of("status", 500, "error", "Internal Server Error", "message", "failed")
        );

        assertEquals("error", result.getViewName());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatus());
        assertEquals(500, result.getModel().get("status"));
        assertEquals("/", result.getModel().get("path"));
    }

    @Test
    void preservesAdminClassificationWhenTheErrorDispatchUriIsError() {
        BrowserErrorViewResolver resolver = new BrowserErrorViewResolver();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/error");
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/admin/mushrooms");

        ModelAndView result = resolver.resolveErrorView(
                request,
                HttpStatus.FORBIDDEN,
                Map.of("status", 403, "error", "Forbidden")
        );

        assertEquals("/admin", result.getModel().get("path"));
        assertEquals(403, result.getModel().get("status"));
    }

    @Test
    void doesNotPassAnUntrustedOriginalUriToTheErrorTemplate() {
        BrowserErrorViewResolver resolver = new BrowserErrorViewResolver();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/error");
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/cultivations/<script>alert(1)</script>");

        ModelAndView result = resolver.resolveErrorView(
                request,
                HttpStatus.INTERNAL_SERVER_ERROR,
                Map.of("status", 500)
        );

        assertEquals("/", result.getModel().get("path"));
    }
}
