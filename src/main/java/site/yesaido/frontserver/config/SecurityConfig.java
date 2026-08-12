package site.yesaido.frontserver.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.user.request.GoogleLoginRequest;
import site.yesaido.frontserver.dto.user.response.TokenResponse;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserClient userClient;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .successHandler((request, response, authentication) -> {
                            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                            String email = oAuth2User.getAttribute("email");
                            String name = oAuth2User.getAttribute("name");
                            if (name == null || name.isBlank()) {
                                name = "구글사용자";
                            }

                            log.info("[구글 OAuth2 로그인 성공] 이메일: {}, 이름: {}", email, name);

                            // 1. Auth_server 로 소셜 회원가입/로그인 요청!
                            ApiResponse<TokenResponse> tokenResponse = userClient.loginWithGoogle(
                                    new GoogleLoginRequest(email, name)
                            );

                            // 2. ResponseCookie 로 현대적 보안 쿠키 생성 (SameSite Lax + HttpOnly)
                            ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokenResponse.data().accessToken())
                                    .path("/")
                                    .httpOnly(true)
                                    .sameSite("Lax")
                                    .build();

                            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

                            // 3. 메인 화면(/)으로 이동!
                            response.sendRedirect("/");
                        })
                );

        return http.build();
    }
}
