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

    @Test
    @DisplayName("관리자가 GET /cultivations(목록)에 접근하면 /admin으로 리다이렉트")
    void adminBlockedFromCultivationList() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertFalse(result);
        assertEquals("/admin", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("관리자가 POST /cultivations(생성)에 접근하면 /admin으로 리다이렉트")
    void adminBlockedFromCultivationCreate() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/cultivations");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertFalse(result);
        assertEquals("/admin", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("관리자가 GET /cultivations/{id}(상세 조회)에 접근하면 통과")
    void adminAllowedForCultivationDetailGet() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations/100");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }

    @Test
    @DisplayName("관리자가 GET /cultivations/{id}/sensor-values(폴링) 등 하위 조회 API에 접근하면 통과")
    void adminAllowedForCultivationDetailSubPathGet() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/cultivations/100/sensor-values");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }

    @Test
    @DisplayName("관리자가 DELETE /cultivations/{id}(경작지 삭제)에 접근하면 통과")
    void adminAllowedForCultivationDelete() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/cultivations/100");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertTrue(result);
    }

    @Test
    @DisplayName("관리자가 DELETE /cultivations/{id}/members/{userId}(멤버 제거)에 접근하면 /admin으로 리다이렉트")
    void adminBlockedFromMemberRemoval() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/cultivations/100/members/5");
        request.setCookies(new Cookie("accessToken", "tokenVal"), new Cookie("role", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestUserClass target = new TestUserClass();
        Method method = TestUserClass.class.getMethod("requiredMethod");
        HandlerMethod handlerMethod = new HandlerMethod(target, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);
        assertFalse(result);
        assertEquals("/admin", response.getRedirectedUrl());
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
