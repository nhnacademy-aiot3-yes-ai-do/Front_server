package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightCandidateResponse;
import site.yesaido.frontserver.dto.ai.insight.InsightDetailResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InsightApiControllerTest {

    @Mock
    private AiClient aiClient;

    @InjectMocks
    private InsightApiController controller;

    @Test
    @DisplayName("우수 수확 추천 카드 목록 조회 - AiClient 정상 위임 검증")
    void getCandidates_success() {
        Long cultivationId = 10L;
        InsightCandidateResponse candidate = new InsightCandidateResponse(
                1L, cultivationId, 1L, 95, BigDecimal.valueOf(1500.0),
                BigDecimal.valueOf(20.5), BigDecimal.valueOf(80.0), BigDecimal.valueOf(750.0),
                BigDecimal.valueOf(100.0), "우수 수확 요약", LocalDateTime.now()
        );
        ApiResponse<List<InsightCandidateResponse>> mockResponse = new ApiResponse<>(true, "SUCCESS", List.of(candidate));
        when(aiClient.getInsightCandidates(cultivationId)).thenReturn(mockResponse);

        ApiResponse<List<InsightCandidateResponse>> result = controller.getCandidates(cultivationId);

        assertThat(result).isNotNull();
        assertThat(result.success()).isTrue();
        assertThat(result.data()).hasSize(1);
        assertThat(result.data().getFirst().insightId()).isEqualTo(1L);
        verify(aiClient).getInsightCandidates(cultivationId);
    }

    @Test
    @DisplayName("인사이트 상세 및 타임라인 조회 - targetDate 포함 정상 위임 검증")
    void getDetail_withTargetDate_success() {
        Long insightId = 1L;
        String targetDate = "2026-09-03";
        InsightDetailResponse detail = new InsightDetailResponse(
                insightId, 10L, 1L, 95, BigDecimal.valueOf(1500.0), "상세 요약", List.of()
        );
        ApiResponse<InsightDetailResponse> mockResponse = new ApiResponse<>(true, "SUCCESS", detail);
        when(aiClient.getInsightDetail(insightId, targetDate)).thenReturn(mockResponse);

        ApiResponse<InsightDetailResponse> result = controller.getDetail(insightId, targetDate);

        assertThat(result).isNotNull();
        assertThat(result.success()).isTrue();
        assertThat(result.data().insightId()).isEqualTo(insightId);
        verify(aiClient).getInsightDetail(insightId, targetDate);
    }

    @Test
    @DisplayName("인사이트 상세 조회 - targetDate 미포함 정상 위임 검증")
    void getDetail_withoutTargetDate_success() {
        Long insightId = 1L;
        InsightDetailResponse detail = new InsightDetailResponse(
                insightId, 10L, 1L, 95, BigDecimal.valueOf(1500.0), "상세 요약", List.of()
        );
        ApiResponse<InsightDetailResponse> mockResponse = new ApiResponse<>(true, "SUCCESS", detail);
        when(aiClient.getInsightDetail(insightId, null)).thenReturn(mockResponse);

        ApiResponse<InsightDetailResponse> result = controller.getDetail(insightId, null);

        assertThat(result).isNotNull();
        assertThat(result.success()).isTrue();
        assertThat(result.data().insightId()).isEqualTo(insightId);
        verify(aiClient).getInsightDetail(insightId, null);
    }
}
