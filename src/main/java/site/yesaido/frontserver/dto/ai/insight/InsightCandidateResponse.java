package site.yesaido.frontserver.dto.ai.insight;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// 유사 환경 우수 수확 추천 카드에 표시되는 개별 수확 사례 DTO
public record InsightCandidateResponse(
        Long insightId,                 // 인사이트 고유 ID (상세 조회 시 사용)
        Long cultivationId,             // 수확이 완료된 원본 재배지 ID
        Long mushroomId,                // 버섯 종류 ID (1:느타리, 2:양송이, 3:새송이, 4:팽이, 5:표고)
        Integer growthScore,            // 재배 기간 동안의 환경 적정 유지 점수 (100점 만점)
        BigDecimal harvestWeightGrams,  // 최종 수확량 (g 단위)
        BigDecimal avgTemperature,      // 전 재배 기간의 평균 온도 (℃)
        BigDecimal avgHumidity,         // 전 재배 기간의 평균 습도 (%)
        BigDecimal avgCo2,              // 전 재배 기간의 평균 CO2 농도 (ppm)
        BigDecimal avgLight,            // 전 재배 기간의 평균 조도 (lx)
        String summary,                 // AI가 작성한 수확 성공 핵심 요약 문장
        LocalDateTime createdAt         // 수확 인사이트 데이터 생성 일시
) {}
