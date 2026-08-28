package site.yesaido.frontserver.exception;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.autoconfigure.error.ErrorViewResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.ModelAndView;

import java.util.Map;

@Component
public class BrowserErrorViewResolver implements ErrorViewResolver {

    private static final String ERROR = "error";
    private static final String ADMIN_PATH = "/admin";
    private static final String USER_PATH = "/";

    @Override
    public ModelAndView resolveErrorView(
            HttpServletRequest request,
            HttpStatus status,
            Map<String, Object> errorAttributes
    ) {
        ModelAndView modelAndView = new ModelAndView(ERROR);
        modelAndView.setStatus(status);
        modelAndView.addObject("status", status.value());
        modelAndView.addObject(ERROR, stringAttribute(errorAttributes, ERROR, status.getReasonPhrase()));
        modelAndView.addObject(
                "message",
                stringAttribute(errorAttributes, "message", "일시적인 서버 오류가 발생했습니다.")
        );
        modelAndView.addObject("path", resolveErrorPagePath(request, errorAttributes));
        modelAndView.addObject("timestamp", errorAttributes.get("timestamp"));
        return modelAndView;
    }

    private String resolveErrorPagePath(HttpServletRequest request, Map<String, Object> errorAttributes) {
        Object originalPath = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        String path = originalPath instanceof String originalUri && !originalUri.isBlank()
                ? originalUri
                : stringAttribute(errorAttributes, "path", request.getRequestURI());
        return isAdminPath(path) ? ADMIN_PATH : USER_PATH;
    }

    private boolean isAdminPath(String path) {
        return ADMIN_PATH.equals(path) || path.startsWith(ADMIN_PATH + "/");
    }

    private String stringAttribute(Map<String, Object> attributes, String name, String fallback) {
        Object value = attributes.get(name);
        return value instanceof String text && !text.isBlank() ? text : fallback;
    }
}
