package site.yesaido.frontserver.util;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ViewJsonWriter {
    private final ObjectMapper objectMapper;

    public ViewJsonWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * JSON을 HTML script raw-text context에도 안전하게 사용할 수 있는 형태로 직렬화합니다.
     * JSON 문법은 유지되며, 브라우저의 JSON.parse/Jackson 처리는 원래 문자로 복원합니다.
     */
    public String toJson(Object value) {
        return objectMapper.writeValueAsString(value)
                .replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026")
                .replace("\u2028", "\\u2028")
                .replace("\u2029", "\\u2029");
    }

    /** toJson()와 동일하게 script raw-text context 안전 직렬화를 수행합니다. */
    public String toScriptJson(Object value) {
        return toJson(value);
    }
}