package site.yesaido.frontserver.auth;

import feign.RetryableException;
import feign.Retryer;

public class TokenReissueOnlyRetryer implements Retryer {
    // 실제 재시도 로직은 직접 구현하는게 아니라 Feign이 제공하는 재시도 로직을 사용함
    private final Retryer.Default delegate;

    public TokenReissueOnlyRetryer() {
        // 첫 재시도까지 대기 시간: 100ms
        // 대기 시간 상한: 100ms
        // 최대 시도 횟수: 최초 1회 + 재시도 (총합 2번)
        this(new Retryer.Default(100, 100, 2));
    }

    private TokenReissueOnlyRetryer(Retryer.Default delegate) {
        this.delegate = delegate;
    }

    @Override
    public void continueOrPropagate(RetryableException e) {
        if (!(e instanceof TokenReissueRetryableException)) {
            throw e; // 토큰 재발급이 원인이 아니면 재시도하지 않고 그대로 전파
        }
        delegate.continueOrPropagate(e);
    }

    @Override
    public Retryer clone() {
        return new TokenReissueOnlyRetryer((Retryer.Default) delegate.clone());
    }
}