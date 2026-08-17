package site.yesaido.frontserver.auth;

import feign.Request;
import feign.RetryableException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class TokenReissueOnlyRetryerTest {

    private final TokenReissueOnlyRetryer retryer = new TokenReissueOnlyRetryer();

    @Test
    @DisplayName("토큰 재발급으로 인한 예외가 아니면 재시도하지 않고 그대로 전파한다")
    void nonTokenReissueExceptionIsPropagated() {
        RetryableException plainException = createPlainException();

        RetryableException thrown = assertThrows(RetryableException.class,
                () -> retryer.continueOrPropagate(plainException));

        assertSame(plainException, thrown);
    }

    @Test
    @DisplayName("토큰 재발급 예외는 delegate에게 위임되어 남은 재시도 횟수 안에서는 예외를 던지지 않는다")
    void tokenReissueExceptionIsDelegatedAndAllowsFirstRetry() {
        TokenReissueRetryableException reissueException = createReissueException();

        assertDoesNotThrow(() -> retryer.continueOrPropagate(reissueException));
    }

    @Test
    @DisplayName("토큰 재발급 예외라도 재시도 횟수를 모두 소진하면 결국 예외를 전파한다")
    void tokenReissueExceptionThrowsWhenRetriesExhausted() {
        retryer.continueOrPropagate(createReissueException());

        TokenReissueRetryableException secondException = createReissueException();
        assertThrows(RetryableException.class,
                () -> retryer.continueOrPropagate(secondException));
    }

    @Test
    @DisplayName("clone은 새로운 인스턴스를 반환하고 내부 재시도 횟수를 초기화한다")
    void cloneResetsRetryState() {
        retryer.continueOrPropagate(createReissueException());
        TokenReissueRetryableException secondException = createReissueException();
        assertThrows(RetryableException.class,
                () -> retryer.continueOrPropagate(secondException));

        feign.Retryer cloned = retryer.clone();

        TokenReissueRetryableException thirdException = createReissueException();
        assertNotSame(retryer, cloned);
        assertDoesNotThrow(() -> cloned.continueOrPropagate(thirdException));
    }

    private RetryableException createPlainException() {
        Request request = Request.create(Request.HttpMethod.GET, "/api/test",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null);
        return new RetryableException(500, "일반 오류", Request.HttpMethod.GET, (Long) null, request);
    }

    private TokenReissueRetryableException createReissueException() {
        Request request = Request.create(Request.HttpMethod.GET, "/api/test",
                Collections.emptyMap(), null, StandardCharsets.UTF_8, null);
        return new TokenReissueRetryableException(401, "재발급 후 재시도", Request.HttpMethod.GET, request);
    }
}