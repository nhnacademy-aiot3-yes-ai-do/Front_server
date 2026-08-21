package site.yesaido.frontserver.util;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ViewJsonWriter {
    private final ObjectMapper objectMapper;

    public ViewJsonWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String toJson(Object value) {
        return objectMapper.writeValueAsString(value);
    }

    /** HTML script raw-text context에서 태그 종료가 일어나지 않도록 JSON을 안전하게 만듭니다. */
    public String toScriptJson(Object value) {
        return toJson(value)
                .replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026")
                .replace("\u2028", "\\u2028")
                .replace("\u2029", "\\u2029");
    }
}