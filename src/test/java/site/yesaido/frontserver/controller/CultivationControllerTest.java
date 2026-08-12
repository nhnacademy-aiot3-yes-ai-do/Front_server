package site.yesaido.frontserver.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.dto.cultivation.request.*;
import site.yesaido.frontserver.dto.cultivation.response.*;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CultivationController.class)
@Import(AuthCookieProvider.class)
class CultivationControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CultivationClient cultivationClient;

    @MockitoBean
    private UserClient userClient;

    @Test
    @DisplayName("로그인 안 한 상태로 목록 접근 시 로그인 페이지로 리다이렉트")
    void listWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/cultivations"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("내 재배지 목록 조회 성공")
    void listReturnsCultivationListView() throws Exception {
        // 컨트롤러는 Thymeleaf JS 인라인 직렬화를 위해 record를 Map(+ createdAt 문자열)으로 변환한다.
        LocalDateTime createdAt = LocalDateTime.of(2026, 8, 12, 10, 0, 0);
        CultivationSummaryResponse summary = new CultivationSummaryResponse(
                1L, "테스트 재배", 10L, "GROWTH", "GROWTH", 3, "오너닉네임", createdAt);
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(List.of(summary)));

        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("cultivationId", 1L);
        expected.put("name", "테스트 재배");
        expected.put("mushroomId", 10L);
        expected.put("status", "GROWTH");
        expected.put("mode", "GROWTH");
        expected.put("memberCount", 3);
        expected.put("ownerNickname", "오너닉네임");
        expected.put("createdAt", createdAt.toString());

        mockMvc.perform(get("/cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/list"))
                .andExpect(model().attribute("cultivations", List.of(expected)));
    }

    @Test
    @DisplayName("재배 생성 폼 페이지 반환")
    void createCultivationPageReturnsCreateView() throws Exception {
        mockMvc.perform(get("/cultivations/new").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/create"));
    }

    @Test
    @DisplayName("재배 이력 조회 성공")
    void cultivationHistoryReturnsHistoryView() throws Exception {
        // 컨트롤러는 history를 record 대신 Map 뷰 모델로 넣는다 (content 항목의 finishedAt 문자열 변환).
        CultivationHistoryPageResponse history = new CultivationHistoryPageResponse(List.of(), 0, 0L, 0, 20);
        when(cultivationClient.getHistory(0, 20)).thenReturn(ResponseEntity.ok(history));

        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("content", List.of());
        expected.put("totalPages", 0);
        expected.put("totalElements", 0L);
        expected.put("number", 0);
        expected.put("size", 20);

        mockMvc.perform(get("/cultivations/history").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/history"))
                .andExpect(model().attribute("history", expected));
    }

    @Test
    @DisplayName("재배 생성 성공 시 목록으로 리다이렉트")
    void createCultivationRedirectsToList() throws Exception {
        mockMvc.perform(post("/cultivations")
                        .cookie(LOGGED_IN)
                        .param("name", "새 재배")
                        .param("mushroomId", "5"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/cultivations"));

        verify(cultivationClient).createCultivation(new CultivationCreateRequest("새 재배", 5L));
    }

    @Test
    @DisplayName("재배 상세 조회 성공")
    void detailReturnsDashboardView() throws Exception {
        Long cultivationId = 1L;
        LocalDateTime startedAt = LocalDateTime.of(2026, 8, 1, 9, 0, 0);
        LocalDateTime createdAt = LocalDateTime.of(2026, 8, 1, 9, 0, 0);
        LocalDateTime joinedAt = LocalDateTime.of(2026, 8, 12, 11, 0, 0);
        CultivationDetailResponse detail = new CultivationDetailResponse(
                cultivationId, "테스트 재배", 10L, "GROWTH", "GROWTH",
                startedAt, null, createdAt, null);
        MemberResponse member = new MemberResponse(1L, 100L, "닉네임", "OWNER", joinedAt);

        when(cultivationClient.getDetailCultivation(cultivationId)).thenReturn(ResponseEntity.ok(detail));
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(List.of(member)));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(List.of()));

        // members/photos만 Map 변환. cultivation 상세는 record 그대로 model에 넣는다.
        Map<String, Object> expectedMember = new LinkedHashMap<>();
        expectedMember.put("memberId", 1L);
        expectedMember.put("userId", 100L);
        expectedMember.put("nickname", "닉네임");
        expectedMember.put("role", "OWNER");
        expectedMember.put("joinedAt", joinedAt.toString());

        mockMvc.perform(get("/cultivations/{cultivation-id}", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/main"))
                .andExpect(model().attribute("cultivation", detail))
                .andExpect(model().attribute("members", List.of(expectedMember)));
    }

    @Test
    @DisplayName("재배 종료 성공 시 상세 페이지로 리다이렉트")
    void finishRedirectsToDetail() throws Exception {
        Long cultivationId = 1L;

        mockMvc.perform(post("/cultivations/{cultivation-id}/finish", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/cultivations/" + cultivationId));

        verify(cultivationClient).finishCultivation(cultivationId);
    }

    @Test
    @DisplayName("멤버 목록 조회 성공")
    void getMembersReturnsMemberList() throws Exception {
        Long cultivationId = 1L;
        MemberResponse member = new MemberResponse(1L, 100L, "닉네임", "MEMBER", LocalDateTime.now());
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(List.of(member)));

        mockMvc.perform(get("/cultivations/{cultivation-id}/members", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname").value("닉네임"));
    }

    @Test
    @DisplayName("멤버 검색 성공")
    void searchMembersReturnsUserSearchResults() throws Exception {
        Long cultivationId = 1L;
        UserSearchResponse searchResult = new UserSearchResponse(200L, "검색된유저");
        when(userClient.search("검색")).thenReturn(List.of(searchResult));

        mockMvc.perform(get("/cultivations/{cultivation-id}/members/search", cultivationId)
                        .cookie(LOGGED_IN)
                        .param("keyword", "검색"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname").value("검색된유저"));
    }

    @Test
    @DisplayName("멤버 추가 성공")
    void addMemberReturnsOk() throws Exception {
        Long cultivationId = 1L;
        MemberAddFormRequest request = new MemberAddFormRequest(200L);

        mockMvc.perform(post("/cultivations/{cultivation-id}/members", cultivationId)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(cultivationClient).addMember(cultivationId, new MemberAddRequest(200L, "MEMBER"));
    }

    @Test
    @DisplayName("멤버 삭제 성공")
    void removeMemberReturnsNoContent() throws Exception {
        Long cultivationId = 1L;
        Long userId = 200L;

        mockMvc.perform(delete("/cultivations/{cultivation-id}/members/{user-id}", cultivationId, userId)
                        .cookie(LOGGED_IN))
                .andExpect(status().isNoContent());

        verify(cultivationClient).removeMember(cultivationId, userId);
    }

    @Test
    @DisplayName("소유권 이전 성공")
    void transferOwnershipReturnsOk() throws Exception {
        Long cultivationId = 1L;
        OwnerTransferRequest request = new OwnerTransferRequest(200L);

        mockMvc.perform(put("/cultivations/{cultivation-id}/owner", cultivationId)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(cultivationClient).transferOwnership(cultivationId, request);
    }

    @Test
    @DisplayName("수확 기록 성공")
    void createHarvestReturnsHarvestResponse() throws Exception {
        Long cultivationId = 1L;
        HarvestCreateRequest request = new HarvestCreateRequest(new BigDecimal("3.5"), "메모");
        HarvestCreateResponse response = new HarvestCreateResponse(
                500L, request.harvestWeight(), LocalDateTime.now(), null, null);

        when(cultivationClient.createHarvest(eq(cultivationId), any(HarvestCreateRequest.class)))
                .thenReturn(ResponseEntity.ok(response));

        mockMvc.perform(post("/cultivations/{cultivation-id}/harvest", cultivationId)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.harvestId").value(500L));
    }
}