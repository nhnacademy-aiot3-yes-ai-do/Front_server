package site.yesaido.frontserver.dto.react;

import java.io.Serial;
import java.io.Serializable;

public record AuthResultResponse(
        String type,
        String message,
        String email
) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    public AuthResultResponse(String type, String message) {
        this(type, message, null);
    }
}
