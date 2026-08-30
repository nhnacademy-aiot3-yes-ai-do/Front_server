package site.yesaido.frontserver.exception;

public class TooManyFilesException extends RuntimeException {
    public TooManyFilesException(String message) {
        super(message);
    }
}