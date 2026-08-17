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
}