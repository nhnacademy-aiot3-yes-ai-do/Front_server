package site.yesaido.frontserver.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;

class UpstreamResponseUtilsTest {

    @Test
    @DisplayName("isolate - 상태코드와 바디만 유지하고 업스트림 헤더는 제거한다")
    void isolateStripsHeaders() {
        HttpHeaders upstreamHeaders = new HttpHeaders();
        upstreamHeaders.add("X-Upstream-Secret", "should-not-leak");
        upstreamHeaders.add(HttpHeaders.SET_COOKIE, "session=abc");
        ResponseEntity<String> upstream = new ResponseEntity<>("hello", upstreamHeaders, HttpStatus.OK);

        ResponseEntity<String> result = UpstreamResponseUtils.isolate(upstream);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("hello", result.getBody());
        assertTrue(result.getHeaders().isEmpty());
    }

    @Test
    @DisplayName("isolate - 4xx/5xx 상태코드도 그대로 보존한다")
    void isolatePreservesErrorStatus() {
        ResponseEntity<String> upstream = ResponseEntity.status(HttpStatus.CONFLICT).body("conflict");

        ResponseEntity<String> result = UpstreamResponseUtils.isolate(upstream);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        assertEquals("conflict", result.getBody());
    }

    @Test
    @DisplayName("isolateWithLocation - Location 헤더가 없으면 헤더 없이 반환한다")
    void isolateWithLocationWithoutLocationHeader() {
        ResponseEntity<Void> upstream = ResponseEntity.status(HttpStatus.OK).build();

        ResponseEntity<Void> result = UpstreamResponseUtils.isolateWithLocation(upstream);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNull(result.getHeaders().getLocation());
        assertTrue(result.getHeaders().isEmpty());
    }

    @Test
    @DisplayName("isolateWithLocation - Location 헤더만 보존하고 나머지 업스트림 헤더는 제거한다")
    void isolateWithLocationPreservesOnlyLocation() {
        URI redirectUri = URI.create("https://yes-nhn.site/login");
        HttpHeaders upstreamHeaders = new HttpHeaders();
        upstreamHeaders.setLocation(redirectUri);
        upstreamHeaders.add("X-Upstream-Secret", "should-not-leak");
        ResponseEntity<Void> upstream = new ResponseEntity<>(null, upstreamHeaders, HttpStatus.FOUND);

        ResponseEntity<Void> result = UpstreamResponseUtils.isolateWithLocation(upstream);

        assertEquals(HttpStatus.FOUND, result.getStatusCode());
        assertEquals(redirectUri, result.getHeaders().getLocation());
        assertNull(result.getHeaders().getFirst("X-Upstream-Secret"));
        assertEquals(1, result.getHeaders().size());
    }
}