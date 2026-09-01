package site.yesaido.frontserver.util;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

class LoginCheckInterceptorTest {

    private final LoginCheckInterceptor interceptor = new LoginCheckInterceptor();

    @LoginRequired
    static class TestUserClass {
        @LoginRequired
        public void requiredMethod() {
            // 리플렉션으로 어노테이션만 확인하는 테스트용 메서드라 실제로 호출되지 않음
        }

        @LoginRequired(adminOnly = true)
        public void adminOnlyMethod() {
            // 리플렉션으로 어노테이션만 확인하는 테스트용 메서드라 실제로 호출되지 않음
        }

        public void normalMethod() {
            // 리플렉션으로 어노테이션만 확인하는 테스트용 메서드라 실제로 호출되지 않음
        }
    }

    static class TestNormalClass {
        public void normalMethod() {
            // 리플렉션으로 어노테이션만 확인하는 테스트용 메서드라 실제로 호출되지 않음
        }
    }

    @Test
    @DisplayName("handler가 HandlerMethod가 아닌 경우 true 반환")
    void nonHandlerMethodReturnsTrue() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean result = interceptor.preHandle(request, response, new Object());
        assertTrue(result);
    }

    @Test
    @DisplayName("LoginRequired 어노테이션이 없는 경우 true 반환")
    void noAnnotationReturnsTrue() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestNormalClass target = new TestNormalClass();
        Method method = TestNormalClass.class.getMethod("normalMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }

    @Test
    @DisplayName("accessToken 쿠키가 없는 경우 /login 리다이렉트 및 false 반환")
    void noAccessTokenRedirectsToLogin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertFalse(result);
        assertEquals("/login", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("관리자 화면에 accessToken 쿠키 없이 접근하면 /admin/login으로 리다이렉트")
    void noAccessTokenRedirectsToAdminLoginForAdminOnly() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("adminOnlyMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertFalse(result);
        assertEquals("/admin/login", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("adminOnly 요구 시 ROLE 쿠키가 ADMIN이 아니면 / 리다이렉트 및 false 반환")
    void adminOnlyFailsForUserRole() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "USER"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("adminOnlyMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertFalse(result);
        assertEquals("/", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("ADMIN 권한 보유 시 adminOnly 정상 통과")
    void adminOnlyPassesForAdminRole() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("adminOnlyMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }

    @ParameterizedTest(name = "관리자가 {0} {1}에 접근하면 /admin으로 리다이렉트")
    @CsvSource({
            "GET, /cultivations",
            "POST, /cultivations",
            "DELETE, /cultivations/100/members/5"
    })
    @DisplayName("관리자가 허용되지 않은 /cultivations 경로에 접근하면 /admin으로 리다이렉트")
    void adminBlockedFromDisallowedCultivationPaths(String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method reflectMethod = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, reflectMethod);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertFalse(result);
        assertEquals("/admin", response.getRedirectedUrl());
    }

    @ParameterizedTest(name = "관리자가 {0} {1}에 접근하면 통과")
    @CsvSource({
            "GET, /cultivations/100",
            "GET, /cultivations/100/sensor-values",
            "DELETE, /cultivations/100"
    })
    @DisplayName("관리자가 허용된 /cultivations/{id} 관련 경로에 접근하면 통과")
    void adminAllowedForCultivationDetailPaths(String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method reflectMethod = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, reflectMethod);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertTrue(result);
    }

    @Test
    @DisplayName("일반 유저(role=USER)는 /cultivations 목록에 접근해도 차단되지 않음")
    void nonAdminNotBlockedFromCultivationList() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "USER"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }
}
