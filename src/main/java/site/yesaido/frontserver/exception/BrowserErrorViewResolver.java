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

    @Override
    public ModelAndView resolveErrorView(
            HttpServletRequest request,
            HttpStatus status,
            Map<String, Object> errorAttributes
    ) {
        ModelAndView modelAndView = new ModelAndView("error");
        modelAndView.setStatus(status);
        modelAndView.addObject("status", status.value());
        modelAndView.addObject("error", stringAttribute(errorAttributes, "error", status.getReasonPhrase()));
        modelAndView.addObject(
                "message",
                stringAttribute(errorAttributes, "message", "일시적인 서버 오류가 발생했습니다.")
        );
        modelAndView.addObject("path", resolveOriginalPath(request, errorAttributes));
        modelAndView.addObject("timestamp", errorAttributes.get("timestamp"));
        return modelAndView;
    }

    private String resolveOriginalPath(HttpServletRequest request, Map<String, Object> errorAttributes) {
        Object originalPath = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (originalPath instanceof String path && !path.isBlank()) {
            return path;
        }
        return stringAttribute(errorAttributes, "path", request.getRequestURI());
    }

    private String stringAttribute(Map<String, Object> attributes, String name, String fallback) {
        Object value = attributes.get(name);
        return value instanceof String text && !text.isBlank() ? text : fallback;
    }
}
