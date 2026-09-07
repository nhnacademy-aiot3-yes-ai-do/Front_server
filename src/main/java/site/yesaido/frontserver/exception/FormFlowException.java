package site.yesaido.frontserver.exception;

import lombok.Getter;

@Getter
public class FormFlowException extends RuntimeException {
    private final String redirectPath;
    private final String flashAttributeName;

    public FormFlowException(
            String message,
            String redirectPath,
            String flashAttributeName,
            Throwable cause
    ) {
        super(message, cause);
        this.redirectPath = redirectPath;
        this.flashAttributeName = flashAttributeName;
    }
}
