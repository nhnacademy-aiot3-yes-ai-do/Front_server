package site.yesaido.frontserver.auth;

import feign.Request;
import feign.Response;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

import java.nio.charset.StandardCharsets;
import java.util.Collections;

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

    @Test
    @DisplayName("401이 아닐 때 일반 디코더 작동 분기")
    void decodeNon401ReturnsDefaultDecoder() {
        Response feignResponse = createResponse(500, "Internal Error");
        Exception ex = decoder.decode("someMethod", feignResponse);

        assertNotNull(ex);
        assertFalse(ex instanceof TokenReissueRetryableException);
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
    @DisplayName("reissue 메소드 자체 401 오류 시 기본 디코더 반환 분기")
    void decodeReissueMethod401() {
        Response feignResponse = createResponse(401, "Unauthorized");
        Exception ex = decoder.decode("UserClient#reissue", feignResponse);

        assertNotNull(ex);
        assertFalse(ex instanceof TokenReissueRetryableException);
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
    @DisplayName("refreshToken 쿠키가 없을 때 기본 디코더 반환 분기")
    void decodeWithoutRefreshTokenCookie() {
        Response feignResponse = createResponse(401, "Unauthorized");
        Exception ex = decoder.decode("someMethod", feignResponse);

        assertNotNull(ex);
        assertFalse(ex instanceof TokenReissueRetryableException);
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
                .build();
        given(userClient.reissue(any())).willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        Exception ex = decoder.decode("someMethod", feignResponse);

        assertTrue(ex instanceof TokenReissueRetryableException);
        verify(requestTokenHolder).refreshAccessToken("newAccess");
        verify(authCookieProvider).setAuthCookies(response, "newAccess", "newRefresh", "USER");
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

    private Response createResponse(int status, String bodyText) {
        return Response.builder()
                .status(status)
                .reason("Reason")
                .request(Request.create(Request.HttpMethod.GET, "/api/test", Collections.emptyMap(), null, StandardCharsets.UTF_8, null))
                .body(bodyText, StandardCharsets.UTF_8)
                .build();
    }
}
