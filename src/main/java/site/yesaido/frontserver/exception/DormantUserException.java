package site.yesaido.frontserver.exception;

import lombok.Getter;

@Getter
public class DormantUserException extends RuntimeException {
    private final String email;

    public DormantUserException(String email, String message) {
        super(message);
        this.email = email;
    }
}
