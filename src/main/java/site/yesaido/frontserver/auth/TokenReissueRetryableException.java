package site.yesaido.frontserver.auth;

import feign.Request;
import feign.RetryableException;

// Feign의 재시도 로직(Retryer)이 동작하려면 반드시 RetryableException을 상속해야 하므로
// 상속 깊이 초과는 라이브러리 제약에 의한 것이며 구조 변경이 불가능함.
public class TokenReissueRetryableException extends RetryableException { // NOSONAR
    public TokenReissueRetryableException(int status,
                                          String message,
                                          Request.HttpMethod httpMethod,
                                          Request request) {
        super(status, message, httpMethod, (Long) null, request);
    }
}