package site.yesaido.frontserver.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.GoogleLoginRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;
import site.yesaido.frontserver.exception.SecurityFilterChainConfigurationException;
import site.yesaido.frontserver.util.AuthCookieProvider;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserClient userClient;
    private final AuthCookieProvider authCookieProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http){
        try {
            http
                    .csrf(AbstractHttpConfigurer::disable)
                    .formLogin(AbstractHttpConfigurer::disable)
                    .httpBasic(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                            .anyRequest().permitAll()
                    )
                    .oauth2Login(oauth2 -> oauth2
                            .loginPage("/login")
                            .successHandler(oAuth2SuccessHandler())
                            .failureHandler(oAuth2FailureHandler())
                    );

            return http.build();
        } catch (Exception e) {
            throw new SecurityFilterChainConfigurationException("SecurityFilterChain 구성에 실패했습니다.", e);
        }
    }

    /**
     * Google OAuth2 로그인 성공 핸들러
     */
    private AuthenticationSuccessHandler oAuth2SuccessHandler() {
        return (request, response, authentication) -> {
            try {
                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                String email = oAuth2User.getAttribute("email");
                String name = oAuth2User.getAttribute("name");
                if (name == null || name.isBlank()) {
                    name = "구글사용자";
                }

                String idToken = "";
                if (oAuth2User instanceof OidcUser oidcUser) {
                    idToken = oidcUser.getIdToken().getTokenValue();
                }

                if (idToken.isBlank()) {
                    log.error("[OAuth2 핸들러] Google ID Token 획득 실패");
                    response.sendRedirect("/login?error=no_id_token");
                    return;
                }

                log.info("[구글 OAuth2 로그인 성공]");

                // 1. Auth_server 로 소셜 회원가입/로그인 요청
                ApiResponse<TokenResponse> tokenResponse = userClient.loginWithGoogle(
                        new GoogleLoginRequest(idToken, email, name)
                );

                TokenResponse data = tokenResponse.data();

                authCookieProvider.setAuthCookies(response, data.accessToken(), data.refreshToken(), data.role());

                response.sendRedirect("/");
            } catch (Exception e) {
                log.error("[OAuth2 성공 핸들러 예외 발생] {}", e.getMessage(), e);
                response.sendRedirect("/login?error=oauth_process_failed");
            }
        };
    }

    /**
     * Google OAuth2 로그인 실패 핸들러
     */
    private AuthenticationFailureHandler oAuth2FailureHandler() {
        return (request, response, exception) -> {
            log.warn("[구글 OAuth2 로그인 실패] 원인: {}", exception.getMessage());
            response.sendRedirect("/login?error=oauth_failed");
        };
    }
}
