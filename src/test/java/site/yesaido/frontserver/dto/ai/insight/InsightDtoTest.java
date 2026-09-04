package site.yesaido.frontserver.dto.ai.insight;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InsightDtoTest {

    @Test
    @DisplayName("InsightCandidateResponse 레코드 필드 및 생성자 검증")
    void insightCandidateResponseTest() {
        LocalDateTime now = LocalDateTime.now();
        InsightCandidateResponse candidate = new InsightCandidateResponse(
                1L, 10L, 2L, 90, BigDecimal.valueOf(1200.5),
                BigDecimal.valueOf(22.0), BigDecimal.valueOf(85.0), BigDecimal.valueOf(700.0),
                BigDecimal.valueOf(150.0), "테스트 요약", now
        );

        assertThat(candidate.insightId()).isEqualTo(1L);
        assertThat(candidate.cultivationId()).isEqualTo(10L);
        assertThat(candidate.mushroomId()).isEqualTo(2L);
        assertThat(candidate.growthScore()).isEqualTo(90);
        assertThat(candidate.harvestWeightGrams()).isEqualTo(BigDecimal.valueOf(1200.5));
        assertThat(candidate.avgTemperature()).isEqualTo(BigDecimal.valueOf(22.0));
        assertThat(candidate.avgHumidity()).isEqualTo(BigDecimal.valueOf(85.0));
        assertThat(candidate.avgCo2()).isEqualTo(BigDecimal.valueOf(700.0));
        assertThat(candidate.avgLight()).isEqualTo(BigDecimal.valueOf(150.0));
        assertThat(candidate.summary()).isEqualTo("테스트 요약");
        assertThat(candidate.createdAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("InsightCandidatesResponse 레코드 필드 및 생성자 검증")
    void insightCandidatesResponseTest() {
        InsightCandidateResponse candidate = new InsightCandidateResponse(
                1L, 10L, 2L, 90, BigDecimal.valueOf(1200.5),
                BigDecimal.valueOf(22.0), BigDecimal.valueOf(85.0), BigDecimal.valueOf(700.0),
                BigDecimal.valueOf(150.0), "테스트 요약", LocalDateTime.now()
        );
        InsightCandidatesResponse response = new InsightCandidatesResponse(10L, List.of(candidate));

        assertThat(response.cultivationId()).isEqualTo(10L);
        assertThat(response.candidates()).hasSize(1);
        assertThat(response.candidates().getFirst()).isEqualTo(candidate);
    }

    @Test
    @DisplayName("InsightDetailResponse 및 하위 타임라인 DTO 레코드 필드 검증")
    void insightDetailResponseTest() {
        InsightDetailResponse.TrendPointDto point = new InsightDetailResponse.TrendPointDto(
                "2026-09-03T10:00:00", BigDecimal.valueOf(21.5)
        );
        InsightDetailResponse.SensorTrendSummaryDto trend = new InsightDetailResponse.SensorTrendSummaryDto(
                "TEMPERATURE", "EUI1234", "℃", List.of(point)
        );
        InsightDetailResponse.ComplianceDto compliance = new InsightDetailResponse.ComplianceDto(
                BigDecimal.valueOf(95.0), BigDecimal.valueOf(90.0), BigDecimal.valueOf(88.0), BigDecimal.valueOf(92.0)
        );
        InsightDetailResponse.DailyTimelineDto timeline = new InsightDetailResponse.DailyTimelineDto(
                LocalDate.of(2026, 9, 3), compliance, List.of(trend)
        );

        InsightDetailResponse detail = new InsightDetailResponse(
                1L, 10L, 2L, 95, BigDecimal.valueOf(1500.0), "상세 보고서", List.of(timeline)
        );

        assertThat(detail.insightId()).isEqualTo(1L);
        assertThat(detail.cultivationId()).isEqualTo(10L);
        assertThat(detail.mushroomId()).isEqualTo(2L);
        assertThat(detail.growthScore()).isEqualTo(95);
        assertThat(detail.harvestWeightGrams()).isEqualTo(BigDecimal.valueOf(1500.0));
        assertThat(detail.summary()).isEqualTo("상세 보고서");
        assertThat(detail.dailyTimelines()).hasSize(1);

        InsightDetailResponse.DailyTimelineDto timelineResult = detail.dailyTimelines().getFirst();
        assertThat(timelineResult.targetDate()).isEqualTo(LocalDate.of(2026, 9, 3));
        assertThat(timelineResult.compliance().temperatureRate()).isEqualTo(BigDecimal.valueOf(95.0));
        assertThat(timelineResult.compliance().humidityRate()).isEqualTo(BigDecimal.valueOf(90.0));
        assertThat(timelineResult.compliance().co2Rate()).isEqualTo(BigDecimal.valueOf(88.0));
        assertThat(timelineResult.compliance().lightRate()).isEqualTo(BigDecimal.valueOf(92.0));

        InsightDetailResponse.SensorTrendSummaryDto trendResult = timelineResult.sensorTrendSummaries().getFirst();
        assertThat(trendResult.sensorType()).isEqualTo("TEMPERATURE");
        assertThat(trendResult.deviceEui()).isEqualTo("EUI1234");
        assertThat(trendResult.unit()).isEqualTo("℃");
        assertThat(trendResult.points().getFirst().timestamp()).isEqualTo("2026-09-03T10:00:00");
        assertThat(trendResult.points().getFirst().value()).isEqualTo(BigDecimal.valueOf(21.5));
    }
}
