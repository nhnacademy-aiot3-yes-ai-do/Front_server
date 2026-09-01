package site.yesaido.frontserver.dto.react;

public record AuthResultResponse(
        String type,
        String message,
        String email
) {
    public AuthResultResponse(String type, String message) {
        this(type, message, null);
    }
}
