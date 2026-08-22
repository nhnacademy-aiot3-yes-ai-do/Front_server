package site.yesaido.frontserver.auth;

import feign.Response;
import feign.codec.ErrorDecoder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.ReissueRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.DormantUserException;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
public class TokenReissueErrorDecoder implements ErrorDecoder {
    private final UserClient userClient;
    private final RequestTokenHolder requestTokenHolder;
    private final AuthCookieProvider authCookieProvider;
    private final ErrorDecoder defaultDecoder = new Default();

    public TokenReissueErrorDecoder(@Lazy UserClient userClient,
                                    RequestTokenHolder requestTokenHolder,
                                    AuthCookieProvider authCookieProvider) {
        this.userClient = userClient;
        this.requestTokenHolder = requestTokenHolder;
        this.authCookieProvider = authCookieProvider;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        DormantResponseCheck dormantResponseCheck = inspectDormantResponse(response);
        if (dormantResponseCheck.exception() != null) {
            return dormantResponseCheck.exception();
        }
        response = dormantResponseCheck.replayableResponse();

        if (response.status() != 401 || methodKey.contains("#reissue")) {
            return defaultDecoder.decode(methodKey, response);
        }

        return handleReissue(methodKey, response);
    }

    private DormantResponseCheck inspectDormantResponse(Response response) {
        if (response.body() == null) {
            return new DormantResponseCheck(null, response);
        }

        try {
            byte[] bytes = feign.Util.toByteArray(response.body().asInputStream());
            Response replayableResponse = response.toBuilder().body(bytes).build();
            String body = new String(bytes, StandardCharsets.UTF_8);

            if (body.contains("휴면") || body.contains("DORMANT")) {
                ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                String email = attr != null ? attr.getRequest().getParameter("email") : "";
                return new DormantResponseCheck(
                        new DormantUserException(email != null ? email : "", "휴면 계정입니다. 이메일 인증을 진행해 주세요."),
                        replayableResponse
                );
            }

            return new DormantResponseCheck(null, replayableResponse);
        } catch (Exception ignored) {
            return new DormantResponseCheck(null, response);
        }
    }

    private record DormantResponseCheck(DormantUserException exception, Response replayableResponse) {
    }

    private Exception handleReissue(String methodKey, Response response) {
        ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attr == null) {
            return defaultDecoder.decode(methodKey, response);
        }
        HttpServletRequest request = attr.getRequest();
        HttpServletResponse httpResponse = attr.getResponse();

        String refreshToken = cookieValue(request, "refreshToken");
        if (refreshToken == null) {
            return defaultDecoder.decode(methodKey, response);
        }

        try {
            ApiResponse<TokenResponse> reissueResponse = userClient.reissue(new ReissueRequest(refreshToken));
            TokenResponse tokenResponse = reissueResponse != null ? reissueResponse.data() : null;
            if (tokenResponse == null) {
                throw new IllegalStateException("Reissue response is null");
            }

            requestTokenHolder.refreshAccessToken(tokenResponse.accessToken());
            if (httpResponse != null) {
                authCookieProvider.setAuthCookies(httpResponse, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role(), tokenResponse.accessTokenExpiresAt());
            }

            log.info("accessToken 재발급 성공, 원요청 재시도: {}", methodKey);
            return new TokenReissueRetryableException(
                    response.status(), "accessToken 재발급 후 재시도",
                    response.request().httpMethod(), response.request()
            );
        } catch (Exception e) {
            log.warn("accessToken 재발급 실패, 로그인 필요: {}", e.getMessage());
            if (httpResponse != null) {
                authCookieProvider.clearAuthCookies(httpResponse);
            }
            return defaultDecoder.decode(methodKey, response);
        }
    }



    private String cookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (cookie.getName().equals(name)) return cookie.getValue();
        }
        return null;
    }
}
