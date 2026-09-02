import { request } from "./http";

/**
 * 특정 경작지 기준 유사 환경 우수 수확 추천 사례 TOP 5 조회
 */
export function getInsightCandidates(cultivationId) {
  return request(`/api/insights/candidates?cultivationId=${cultivationId}`);
}

/**
 * 특정 인사이트의 상세 AI 분석 보고서 및 일자별 타임라인 조회
 */
export function getInsightDetail(insightId, targetDate) {
  const query = targetDate ? `?targetDate=${targetDate}` : "";
  return request(`/api/insights/${insightId}${query}`);
}
