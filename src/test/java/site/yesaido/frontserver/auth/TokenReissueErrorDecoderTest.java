package site.yesaido.frontserver.auth;

import feign.Request;
import feign.Response;
import feign.FeignException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TokenReissueErrorDecoderTest {

    @Mock
    private UserClient userClient;

    @Mock
    private RequestTokenHolder requestTokenHolder;

    @Mock
    private AuthCookieProvider authCookieProvider;

    @InjectMocks
    private TokenReissueErrorDecoder decoder;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request, response));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @ParameterizedTest(name = "status={0}, methodKey=\"{1}\" \u2192 기본 디코더 반환")
    @MethodSource("defaultDecoderCases")
    @DisplayName("401이 아니거나 / reissue 메소드 자체이거나 / refreshToken 쿠키가 없으면 기본 디코더가 작동한다")
    void decodeReturnsDefaultDecoderWhenNotEligibleForReissue(int status, String methodKey) {
        Response feignResponse = createResponse(status, "Unauthorized");

        Exception ex = decoder.decode(methodKey, feignResponse);

        assertNotNull(ex);
        assertFalse(ex instanceof TokenReissueRetryableException);
    }

    private static Stream<Arguments> defaultDecoderCases() {
        return Stream.of(
                Arguments.of(500, "someMethod"),          // 401이 아님
                Arguments.of(401, "UserClient#reissue"),  // reissue 메소드 자체의 401
                Arguments.of(401, "someMethod")           // refreshToken 쿠키 없음 (요청에 쿠키 미설정)
        );
    }

    @Test
    @DisplayName("휴면 에러 바디 포함 시 DormantUserException 예외 반환 분기")
    void decodeDormantUserExceptionBody() {
        Response feignResponse = createResponse(400, "{\"message\":\"DORMANT 계정입니다.\"}");
        request.setParameter("email", "test@naver.com");

        Exception ex = decoder.decode("someMethod", feignResponse);

        assertTrue(ex instanceof DormantUserException);
    }

    @Test
    @DisplayName("RequestContextHolder 없을 때 기본 디코더 반환 분기")
    void decodeWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        Response feignResponse = createResponse(401, "Unauthorized");

        Exception ex = decoder.decode("someMethod", feignResponse);
        assertNotNull(ex);
    }

    @Test
    @DisplayName("기본 디코더로 넘기는 오류 응답 body를 보존한다")
    void decodePreservesErrorBodyForDefaultDecoder() {
        Response feignResponse = createStreamingResponse(500, "upstream-error-body");

        Exception ex = decoder.decode("someMethod", feignResponse);

        FeignException feignException = assertInstanceOf(FeignException.class, ex);
        assertEquals("upstream-error-body", feignException.contentUTF8());
    }

    @Test
    @DisplayName("재발급 성공 시 TokenReissueRetryableException 반환 및 쿠키/홀더 갱신 분기")
    void decodeReissueSuccess() {
        request.setCookies(new Cookie("refreshToken", "validRefresh"));
        Response feignResponse = createResponse(401, "Unauthorized");

        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("newAccess")
                .refreshToken("newRefresh")
                .role("USER")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.reissue(any())).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        Exception ex = decoder.decode("someMethod", feignResponse);

        assertTrue(ex instanceof TokenReissueRetryableException);
        verify(requestTokenHolder).refreshAccessToken("newAccess");
        verify(authCookieProvider).setAuthCookies(response, "newAccess", "newRefresh", "USER", 1_755_671_400_000L);
    }

    @Test
    @DisplayName("재발급 예외 발생 시 쿠키 클리어 후 기본 디코더 반환 분기")
    void decodeReissueExceptionClearsCookies() {
        request.setCookies(new Cookie("refreshToken", "invalidRefresh"));
        Response feignResponse = createResponse(401, "Unauthorized");

        given(userClient.reissue(any())).willThrow(new RuntimeException("Reissue failed"));

        Exception ex = decoder.decode("someMethod", feignResponse);

        assertNotNull(ex);
        verify(authCookieProvider).clearAuthCookies(response);
    }

    @Test
    @DisplayName("재발급 실패 후 기본 디코더도 one-shot 오류 body를 보존한다")
    void decodeReissueFailurePreservesStreamingErrorBody() {
        request.setCookies(new Cookie("refreshToken", "invalidRefresh"));
        Response feignResponse = createStreamingResponse(401, "original-unauthorized-body");
        given(userClient.reissue(any())).willThrow(new RuntimeException("Reissue failed"));

        Exception ex = decoder.decode("someMethod", feignResponse);

        FeignException feignException = assertInstanceOf(FeignException.class, ex);
        assertEquals("original-unauthorized-body", feignException.contentUTF8());
        verify(authCookieProvider).clearAuthCookies(response);
    }

    private Response createResponse(int status, String bodyText) {
        return Response.builder()
                .status(status)
                .reason("Reason")
                .request(Request.create(Request.HttpMethod.GET, "/api/test", Collections.emptyMap(), null, StandardCharsets.UTF_8, null))
                .body(bodyText, StandardCharsets.UTF_8)
                .build();
    }

    private Response createStreamingResponse(int status, String bodyText) {
        byte[] bytes = bodyText.getBytes(StandardCharsets.UTF_8);
        return Response.builder()
                .status(status)
                .reason("Reason")
                .request(Request.create(Request.HttpMethod.GET, "/api/test", Collections.emptyMap(), null, StandardCharsets.UTF_8, null))
                .body(new ByteArrayInputStream(bytes), bytes.length)
                .build();
    }
}
