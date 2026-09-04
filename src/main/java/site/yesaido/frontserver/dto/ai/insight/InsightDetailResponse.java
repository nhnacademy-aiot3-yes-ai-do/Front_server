package site.yesaido.frontserver.dto.ai.insight;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// 우수 수확 사례 상세 분석 보고서 및 일자별 환경 타임라인 응답 DTO
public record InsightDetailResponse(
        Long insightId,                        // 인사이트 고유 ID
        Long cultivationId,                    // 수확된 과거 재배지 ID
        Long mushroomId,                       // 버섯 종류 ID
        Integer growthScore,                   // 종합 환경 유지 점수 (100점 만점)
        BigDecimal harvestWeightGrams,         // 최종 수확량 (g 단위)
        String summary,                        // AI 종합 성공 분석 레포트 (환경 제어 평가 및 성공 요인)
        List<DailyTimelineDto> dailyTimelines  // 재배 시작일부터 수확일까지의 일자별 센서/유지율 타임라인 목록
) {
    // 특정 날짜 하루 동안의 환경 유지율과 센서 추이 데이터
    public record DailyTimelineDto(
            LocalDate targetDate,                             // 해당 타임라인 날짜 (YYYY-MM-DD)
            ComplianceDto compliance,                         // 해당 날짜의 4대 센서 적정 환경 유지율
            List<SensorTrendSummaryDto> sensorTrendSummaries  // 해당 날짜의 센서별 15분 시계열 추이 데이터 목록
    ) {}

    // 해당 날짜의 센서별 적정 환경 범위 유지율 (%)
    public record ComplianceDto(
            BigDecimal temperatureRate, // 온도 적정 유지율 (%)
            BigDecimal humidityRate,    // 습도 적정 유지율 (%)
            BigDecimal co2Rate,         // CO2 농도 적정 유지율 (%)
            BigDecimal lightRate        // 조도 적정 유지율 (%)
    ) {}

    // 차트 렌더링을 위한 센서별 15분 단위 추이 데이터 요약
    public record SensorTrendSummaryDto(
            String sensorType,          // 센서 종류 (TEMPERATURE, HUMIDITY, CO2, LIGHT 등)
            String deviceEui,           // 센서 장비 EUI 고유 식별자
            String unit,                // 측정 단위 (℃, %, ppm, lx 등)
            List<TrendPointDto> points  // 15분 간격의 시계열 측정값 목록
    ) {}

    // 차트 그래프의 개별 점 (시간 및 측정값)
    public record TrendPointDto(
            String timestamp,   // 측정 시각 (ISO-8601 시각 문자열)
            BigDecimal value    // 15분 평균 측정값
    ) {}
}
