package site.yesaido.frontserver.auth;

import feign.RetryableException;
import feign.Retryer;

public class TokenReissueOnlyRetryer implements Retryer, Cloneable {
    // 실제 재시도 로직은 직접 구현하는게 아니라 Feign이 제공하는 재시도 로직을 사용함
    private Retryer.Default delegate;

    public TokenReissueOnlyRetryer() {
        // 첫 재시도까지 대기 시간: 100ms
        // 대기 시간 상한: 100ms
        // 최대 시도 횟수: 최초 1회 + 재시도 (총합 2번)
        this.delegate = new Retryer.Default(100, 100, 2);
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
        try {
            TokenReissueOnlyRetryer cloned = (TokenReissueOnlyRetryer) super.clone();
            cloned.delegate = (Retryer.Default) delegate.clone();
            return cloned;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError("Cloneable을 구현했으므로 발생할 수 없음", e);
        }
    }
}