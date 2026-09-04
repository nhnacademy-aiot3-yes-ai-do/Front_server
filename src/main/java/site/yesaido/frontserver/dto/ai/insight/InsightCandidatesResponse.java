package site.yesaido.frontserver.dto.ai.insight;

import java.util.List;

// 현재 재배지 기준 유사 환경 우수 수확 추천 목록 (TOP 5) 응답 DTO
public record InsightCandidatesResponse(
        Long cultivationId,                        // 추천 기준이 된 현재 사용자의 재배지 ID
        List<InsightCandidateResponse> candidates  // 상위 우수 수확 추천 사례 목록 (최대 5개)
) {}
