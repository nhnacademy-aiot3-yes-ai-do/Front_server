package site.yesaido.frontserver.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.GoogleLoginRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.util.AuthCookieProvider;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private UserClient userClient;

    @Mock
    private AuthCookieProvider authCookieProvider;

    private SecurityConfig securityConfig;

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig(userClient, authCookieProvider);
    }

    @Test
    @DisplayName("Google ID Token 획득 성공 시 로그인 처리 후 메인 페이지로 리다이렉트한다")
    void successHandlerRedirectsToMainOnValidIdToken() throws Exception {
        DefaultOidcUser oidcUser = createOidcUser("google-id-token", "test@gmail.com", "테스트유저");
        Authentication authentication = mock(Authentication.class);
        given(authentication.getPrincipal()).willReturn(oidcUser);

        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken("access")
                .refreshToken("refresh")
                .role("USER")
                .accessTokenExpiresAt(1_755_671_400_000L)
                .build();
        given(userClient.loginWithGoogle(any(GoogleLoginRequest.class)))
                .willReturn(new ApiResponse<>(true, "성공", tokenResponse));

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        getSuccessHandler().onAuthenticationSuccess(request, response, authentication);

        verify(authCookieProvider).setAuthCookies(response, "access", "refresh", "USER", 1_755_671_400_000L);
        assertEquals("/", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("OidcUser가 아니라 ID Token을 못 얻으면 에러 파라미터와 함께 로그인 페이지로 리다이렉트한다")
    void successHandlerRedirectsToLoginWhenIdTokenMissing() throws Exception {
        DefaultOAuth2User oAuth2User = new DefaultOAuth2User(
                List.of(), Map.of("email", "test@gmail.com", "name", "테스트유저"), "email");
        Authentication authentication = mock(Authentication.class);
        given(authentication.getPrincipal()).willReturn(oAuth2User);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        getSuccessHandler().onAuthenticationSuccess(request, response, authentication);

        assertEquals("/login?error=no_id_token", response.getRedirectedUrl());
        verifyNoInteractions(userClient, authCookieProvider);
    }

    @Test
    @DisplayName("로그인 처리 중 예외가 발생하면 에러 파라미터와 함께 로그인 페이지로 리다이렉트한다")
    void successHandlerRedirectsToLoginOnException() throws Exception {
        DefaultOidcUser oidcUser = createOidcUser("google-id-token", "test@gmail.com", "테스트유저");
        Authentication authentication = mock(Authentication.class);
        given(authentication.getPrincipal()).willReturn(oidcUser);

        given(userClient.loginWithGoogle(any(GoogleLoginRequest.class)))
                .willThrow(new RuntimeException("auth_server 통신 실패"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        getSuccessHandler().onAuthenticationSuccess(request, response, authentication);

        assertEquals("/login?error=oauth_process_failed", response.getRedirectedUrl());
        verifyNoInteractions(authCookieProvider);
    }

    @Test
    @DisplayName("OAuth2 로그인 실패 시 에러 파라미터와 함께 로그인 페이지로 리다이렉트한다")
    void failureHandlerRedirectsToLoginWithError() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthenticationException exception = new BadCredentialsException("구글 인증 실패");

        getFailureHandler().onAuthenticationFailure(request, response, exception);

        assertEquals("/login?error=oauth_failed", response.getRedirectedUrl());
    }

    private DefaultOidcUser createOidcUser(String idTokenValue, String email, String name) {
        OidcIdToken idToken = new OidcIdToken(
                idTokenValue,
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("sub", "1234567890", "email", email, "name", name)
        );
        return new DefaultOidcUser(List.of(), idToken);
    }

    private AuthenticationSuccessHandler getSuccessHandler() throws Exception {
        Method method = SecurityConfig.class.getDeclaredMethod("oAuth2SuccessHandler");
        method.setAccessible(true);
        return (AuthenticationSuccessHandler) method.invoke(securityConfig);
    }

    private AuthenticationFailureHandler getFailureHandler() throws Exception {
        Method method = SecurityConfig.class.getDeclaredMethod("oAuth2FailureHandler");
        method.setAccessible(true);
        return (AuthenticationFailureHandler) method.invoke(securityConfig);
    }

}
