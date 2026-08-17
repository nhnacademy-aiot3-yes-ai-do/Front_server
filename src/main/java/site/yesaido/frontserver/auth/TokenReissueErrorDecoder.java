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

/*
* Feign 호출이 401을 받으면 그걸 예외로 던지는 대신 refreshToken으로 조용히 재발급 받고 원래 요청을 재시도 시킴
* RequestTokenHolder가 만들어 둔 통로에 새로운 토큰을 채워 넣어주는 주체
*
* front에 있어야 하는 이유?
* accessToken/RefreshToken은 front_server가 브라우저에게 내려주는 httpOnly 쿠키임.
* 부라우저는 front와만 통신을 함. 따라서 토큰이 만료되면 재발급 요청을 받는건 front임.
* */

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

        DormantUserException dormantUserException = checkDormantUser(response);
        if(dormantUserException != null){
            return dormantUserException;
        }

        if (response.status() != 401 || methodKey.contains("#reissue")) {
            return defaultDecoder.decode(methodKey, response);
        }

        return handleReissue(methodKey, response);
    }

    /**
     *
     * 1. 휴면 계정 감지 메서드
     *
     */
    private DormantUserException checkDormantUser(Response response){
        if(response.body() == null) return null;

        try {
            byte[] bytes = feign.Util.toByteArray(response.body().asInputStream());
            String body = new String(bytes, StandardCharsets.UTF_8);

            if ((body.contains("휴면") || body.contains("DORMANT"))) {
                ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                String email = attr != null ? attr.getRequest().getParameter("email") : "";
                return new DormantUserException(email != null ? email : "", "휴면 계정입니다. 이메일 인증을 진행해 주세요.");
            }

            response.toBuilder().body(bytes).build();
        } catch (Exception ignored) {
            // Ignore parse error
        }
        return null;
    }

    /**
     * 2. 401 토큰 재발급 처리 메서드
     *
     */
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
                authCookieProvider.setAuthCookies(httpResponse, tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenResponse.role());
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
