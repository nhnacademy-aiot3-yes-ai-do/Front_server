package site.yesaido.frontserver.exception;

public class SecurityFilterChainConfigurationException extends RuntimeException {
    public SecurityFilterChainConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }
}