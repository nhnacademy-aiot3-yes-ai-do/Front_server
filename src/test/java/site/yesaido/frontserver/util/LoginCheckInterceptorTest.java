package site.yesaido.frontserver.util;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
        public void requiredMethod() {}

        @LoginRequired(adminOnly = true)
        public void adminOnlyMethod() {}

        public void normalMethod() {}
    }

    static class TestNormalClass {
        public void normalMethod() {}
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
}
