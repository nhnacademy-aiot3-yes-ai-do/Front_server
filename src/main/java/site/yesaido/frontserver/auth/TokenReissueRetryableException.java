package site.yesaido.frontserver.auth;

import feign.Request;
import feign.RetryableException;

import java.util.Date;

public class TokenReissueRetryableException extends RetryableException {
    public TokenReissueRetryableException(int status,
                                          String message,
                                          Request.HttpMethod httpMethod,
                                          Request request) {
        super(status, message, httpMethod, (Date) null, request);
    }
}