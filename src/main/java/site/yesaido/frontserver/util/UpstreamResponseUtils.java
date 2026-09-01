package site.yesaido.frontserver.util;

import org.springframework.http.ResponseEntity;

import java.net.URI;

public final class UpstreamResponseUtils {

    private UpstreamResponseUtils() {
    }

    /**
     * 브라우저에 노출할 Front 응답을 upstream 응답의 상태 코드와 본문으로만 재구성합니다.
     * Gateway/서비스의 전송·캐시·인증 헤더가 브라우저 응답으로 유출되지 않도록 합니다.
     */
    public static <T> ResponseEntity<T> isolate(ResponseEntity<T> upstream) {
        //noinspection UncontrolledDataFlow
        return ResponseEntity.status(upstream.getStatusCode())
                .body(upstream.getBody());
    }

    /**
     * 일반 upstream 헤더는 제거하되, 브라우저 계약상 필요한 Location만 보존합니다.
     */
    public static <T> ResponseEntity<T> isolateWithLocation(ResponseEntity<T> upstream) {
        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.status(upstream.getStatusCode());
        URI location = upstream.getHeaders().getLocation();
        if (location != null) {
            responseBuilder.location(location);
        }
        //noinspection UncontrolledDataFlow
        return responseBuilder.body(upstream.getBody());
    }
}
