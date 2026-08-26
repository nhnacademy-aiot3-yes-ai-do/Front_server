package site.yesaido.frontserver.controller;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.security.oauth2.client.autoconfigure.servlet.OAuth2ClientWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.client.SensorClient;
import site.yesaido.frontserver.client.UserClient;
import site.yesaido.frontserver.config.MethodOverrideConfig;
import site.yesaido.frontserver.dto.cultivation.request.cultivation.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddFormRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.MemberAddRequest;
import site.yesaido.frontserver.dto.cultivation.request.cultivationmember.OwnerTransferRequest;
import site.yesaido.frontserver.dto.cultivation.request.harvest.HarvestCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.cultivation.*;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberListResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.MemberResponse;
import site.yesaido.frontserver.dto.cultivation.response.cultivationmember.UserSearchResponse;
import site.yesaido.frontserver.dto.cultivation.response.harvest.HarvestCreateResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoListResponse;
import site.yesaido.frontserver.dto.cultivation.response.mushroom.MushroomReferenceInfoResponse;
import site.yesaido.frontserver.dto.cultivation.response.sensor.*;
import site.yesaido.frontserver.util.AuthCookieProvider;
import site.yesaido.frontserver.util.ViewJsonWriter;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        value = CultivationController.class,
        excludeAutoConfiguration = {
                OAuth2ClientAutoConfiguration.class,
                OAuth2ClientWebSecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc
@Import({AuthCookieProvider.class, ViewJsonWriter.class, MethodOverrideConfig.class})
class CultivationControllerTest {

    private static final Cookie LOGGED_IN = new Cookie("accessToken", "demo-access-token");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CultivationClient cultivationClient;

    @MockitoBean
    private SensorClient sensorClient;

    @MockitoBean
    private UserClient userClient;

    @MockitoBean
    private AiClient aiClient;

    @MockitoBean
    private MeterRegistry meterRegistry;

    @Test
    @DisplayName("로그인 안 한 상태로 목록 접근 시 로그인 페이지로 리다이렉트")
    void listWithoutAccessTokenRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/cultivations"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    @DisplayName("내 재배지 목록 조회 성공 - 일반 데이터 분기")
    void listReturnsCultivationListView() throws Exception {
        CultivationSummaryResponse summary = new CultivationSummaryResponse(
                1L, "테스트 재배", 10L, "GROWTH", "GROWTH", 3, "오너닉네임", LocalDateTime.now());
        SensorTypeInfoResponse sensorType = new SensorTypeInfoResponse(7L, "TEMPERATURE", "°C");
        CultivationSensorResponse sensor = new CultivationSensorResponse(
                12L, "device-eui-12", "MODEL-A", "온도 센서", "재배실", "선반 A", "ACTIVE",
                List.of(new CultivationSensorTypeResponse(7L, "TEMPERATURE", "°C"))
        );
        CultivationSensorListResponse sensors = new CultivationSensorListResponse(
                List.of(sensor), List.of(new EnvironmentSettingResponse(7L, new BigDecimal("18.5"), new BigDecimal("22.0")))
        );
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(new CultivationSummaryListResponse(List.of(summary))));
        when(sensorClient.getSensorTypes()).thenReturn(ResponseEntity.ok(new SensorTypeInfoListResponse(List.of(sensorType))));
        when(sensorClient.getSensors(1L)).thenReturn(ResponseEntity.ok(sensors));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        String expectedJson = objectMapper.writeValueAsString(new CultivationListPageView(
                List.of(new CultivationListItemView(summary, sensors)), List.of(sensorType)
        ));

        mockMvc.perform(get("/cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/list"))
                .andExpect(model().attribute("cultivationListPageJson", expectedJson));
    }

    @Test
    @DisplayName("내 재배지 목록 조회 성공 - wrapper body가 없는 경우")
    void listReturnsEmptyCultivationsWhenWrapperBodyIsNull() throws Exception {
        when(cultivationClient.getCultivations()).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getSensorTypes()).thenReturn(ResponseEntity.ok(new SensorTypeInfoListResponse(List.of())));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/list"))
                .andExpect(model().attribute("cultivationListPageJson", "{\"cultivations\":[],\"sensorTypes\":[]}"));
    }

    @Test
    @DisplayName("재배 생성 폼 페이지 반환")
    void createCultivationPageReturnsCreateView() throws Exception {
        MushroomReferenceInfoResponse mushroom = new MushroomReferenceInfoResponse(
                9L, "표고", "Shiitake", "Lentinula edodes", List.of(), LocalDateTime.now(), LocalDateTime.now()
        );
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of(mushroom))));

        mockMvc.perform(get("/cultivations/new").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/create"))
                .andExpect(model().attribute("mushroomsJson", objectMapper.writeValueAsString(List.of(mushroom))));
    }

    @Test
    @DisplayName("재배 이력 조회 성공 - 일반 데이터 분기")
    void cultivationHistoryReturnsHistoryView() throws Exception {
        CultivationHistoryResponse contentItem = new CultivationHistoryResponse(1L, "재배명", 10L, "FINISHED", new BigDecimal("5.0"), "A", LocalDateTime.now());
        CultivationHistoryPageResponse history = new CultivationHistoryPageResponse(List.of(contentItem), 1, 1L, 0, 20);
        when(cultivationClient.getHistory(0, 20)).thenReturn(ResponseEntity.ok(history));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/history").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/history"));
    }

    @Test
    @DisplayName("재배 이력 조회 성공 - null 응답 분기")
    void cultivationHistoryReturnsNullView() throws Exception {
        when(cultivationClient.getHistory(0, 20)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/history").cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/history"));
    }

    @Test
    @DisplayName("HTML form 재배 삭제 성공 시 목록으로 리다이렉트")
    void deleteCultivationFormRedirectsToList() throws Exception {
        mockMvc.perform(post("/cultivations/{cultivation-id}", 5L)
                        .cookie(LOGGED_IN)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("_method", "DELETE"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/cultivations"));

        verify(cultivationClient).deleteCultivation(5L);
    }

    @Test
    @DisplayName("HTML form 재배 생성 성공 시 목록으로 리다이렉트")
    void createCultivationRedirectsToListForNativeFormSubmission() throws Exception {
        mockMvc.perform(post("/cultivations")
                        .cookie(LOGGED_IN)
                        .param("name", "새 재배")
                        .param("mushroomId", "5"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/cultivations"));

        verify(cultivationClient).createCultivation(new CultivationCreateRequest("새 재배", 5L));
    }

    @Test
    @DisplayName("재배 상세 조회 성공 - 멤버·사진·센서 wrapper body가 없는 경우")
    void detailReturnsDashboardViewWhenListWrapperBodiesAreNull() throws Exception {
        Long cultivationId = 1L;
        CultivationDetailResponse detail = new CultivationDetailResponse(
                cultivationId, "테스트 재배", 10L, "GROWTH", "GROWTH", "MEMBER",
                LocalDateTime.now(), null, LocalDateTime.now(), null);

        when(cultivationClient.getDetailCultivation(cultivationId)).thenReturn(ResponseEntity.ok(detail));
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getSensors(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(sensorClient.getLatestSensorValues(cultivationId)).thenReturn(ResponseEntity.ok(null));
        when(cultivationClient.getHistory(0, 20)).thenReturn(ResponseEntity.ok(new CultivationHistoryPageResponse(List.of(), 0, 0L, 0, 20)));
        when(sensorClient.getAllMushroomReferences()).thenReturn(ResponseEntity.ok(new MushroomReferenceInfoListResponse(List.of())));

        mockMvc.perform(get("/cultivations/{cultivation-id}", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/main"))
                .andExpect(model().attribute("cultivation", detail))
                .andExpect(model().attribute("membersJson", "[]"))
                .andExpect(model().attribute("photosJson", "[]"))
                .andExpect(model().attribute("sensorsJson", "{\"sensors\":[],\"environmentSettings\":[]}"))
                .andExpect(model().attribute("sensorValuesJson", "{\"latestSensorValueResponses\":[]}"));
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
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(new MemberListResponse(List.of(member))));

        mockMvc.perform(get("/cultivations/{cultivation-id}/members", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberResponses[0].nickname").value("닉네임"));
    }

    @Test
    @DisplayName("멤버 검색 성공")
    void searchMembersReturnsUserSearchResults() throws Exception {
        Long cultivationId = 1L;
        UserSearchResponse searchResult = new UserSearchResponse(200L, "검색된유저");
        when(userClient.search("검색")).thenReturn(List.of(searchResult));
        when(cultivationClient.getMembers(cultivationId))
                .thenReturn(ResponseEntity.ok(new MemberListResponse(List.of())));

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

    @Test
    @DisplayName("사진 업로드 및 조회/삭제 테스트 분기")
    void photoOperationsTest() throws Exception {
        Long cultivationId = 1L;
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "test data".getBytes());
        PhotoResponse photo = new PhotoResponse(100L, "key", "uri", "S3", LocalDateTime.now());

        when(cultivationClient.uploadPhoto(eq(cultivationId), any())).thenReturn(ResponseEntity.ok(photo));
        when(cultivationClient.getPhoto(cultivationId)).thenReturn(ResponseEntity.ok(new PhotoListResponse(List.of(photo))));
        when(cultivationClient.deletePhoto(cultivationId, 100L)).thenReturn(ResponseEntity.ok().build());

        mockMvc.perform(multipart("/cultivations/{cultivation-id}/photos", cultivationId)
                        .file(file)
                        .cookie(LOGGED_IN))
                .andExpect(status().isOk());

        mockMvc.perform(get("/cultivations/{cultivation-id}/photos", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/cultivations/{cultivation-id}/photos/100", cultivationId).cookie(LOGGED_IN))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("멤버 검색 - 이미 멤버인 유저는 결과에서 제외")
    void searchMembersExcludesExistingMembers() throws Exception {
        Long cultivationId = 1L;
        UserSearchResponse alreadyMember = new UserSearchResponse(100L, "기존멤버");
        UserSearchResponse newCandidate = new UserSearchResponse(200L, "검색된유저");
        when(userClient.search("검색")).thenReturn(List.of(alreadyMember, newCandidate));
        when(cultivationClient.getMembers(cultivationId)).thenReturn(ResponseEntity.ok(
                new MemberListResponse(List.of(
                        new MemberResponse(1L, 100L, "기존멤버", "MEMBER", LocalDateTime.now())
                ))
        ));

        mockMvc.perform(get("/cultivations/{cultivation-id}/members/search", cultivationId)
                        .cookie(LOGGED_IN)
                        .param("keyword", "검색"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nickname").value("검색된유저"));
    }
}