import {useQuery} from "@tanstack/react-query";
import {CalendarDays, ChevronRight, Sparkles} from "lucide-react";
import {cultivationKeys, getDailyFeedback} from "../../api/cultivations";
import {formatDateTime} from "../../utils/formatters";
import {isDailyFeedbackDate} from "./dailyFeedbackDates";

function isDateInRange(value, minDate, maxDate) {
  return (
    isDailyFeedbackDate(value) &&
    (!minDate || value >= minDate) &&
    (!maxDate || value <= maxDate) &&
    (!minDate || !maxDate || minDate <= maxDate)
  );
}

function formatLocalDate(value) {
  if (!isDailyFeedbackDate(value)) return "-";
  const [year, month, day] = value.split("-");
  return `${year}. ${month}. ${day}.`;
}

function FeedbackMeta({ feedback, feedbackDate }) {
  return (
    <div className="daily-feedback-meta">
      <span>{formatLocalDate(feedback?.feedbackDate || feedbackDate)}</span>
      <span>{feedback?.hasVisionAnalysis ? "사진 분석 포함" : "사진 분석 미포함"}</span>
      {feedback?.createdAt && <span>{formatDateTime(feedback.createdAt)} 생성</span>}
    </div>
  );
}

function InlineQueryState({ canQuery, hasAvailableRange, query }) {
  if (!canQuery) {
    return (
      <p className="daily-feedback-empty">
        {hasAvailableRange
          ? "조회 가능한 날짜를 선택해 주세요."
          : "재배 다음 날부터 피드백을 확인할 수 있어요."}
      </p>
    );
  }
  if (query.isPending) {
    return (
      <div className="daily-feedback-inline-state" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <span>일일 피드백을 불러오고 있어요.</span>
      </div>
    );
  }
  if (query.isError && query.error?.status === 404) {
    return <p className="daily-feedback-empty">이 날짜에는 생성된 일일 피드백이 없습니다.</p>;
  }
  if (query.isError) {
    return (
      <div className="daily-feedback-inline-error" role="alert">
        <p>{query.error?.message || "일일 피드백을 불러오지 못했습니다."}</p>
        <button className="text-button" type="button" onClick={() => query.refetch()}>
          다시 시도
        </button>
      </div>
    );
  }
  return null;
}

function PreviewPanel({
  cultivationName,
  feedbackDate,
  canQuery,
  hasAvailableRange,
  query,
  onOpenReport,
}) {
  const feedback = query.data;

  return (
    <article className="panel-card daily-feedback-preview">
      <div className="daily-feedback-preview__icon" aria-hidden="true">
        <Sparkles />
      </div>
      <div className="daily-feedback-preview__body">
        <h2>어제의 AI 일일 피드백</h2>
        {feedback ? (
          <>
            <FeedbackMeta feedback={feedback} feedbackDate={feedbackDate} />
            <p className="daily-feedback-preview__content">
              {feedback.content || `${cultivationName}에 생성된 피드백 내용이 없습니다.`}
            </p>
          </>
        ) : (
          <InlineQueryState
            canQuery={canQuery}
            hasAvailableRange={hasAvailableRange}
            query={query}
          />
        )}
      </div>
      <button
        className="button button--secondary daily-feedback-preview__button"
        type="button"
        onClick={() => onOpenReport?.(feedbackDate)}
      >
        전체 리포트 보기
        <ChevronRight aria-hidden="true" />
      </button>
    </article>
  );
}

function ReportPanel({
  feedbackDate,
  minDate,
  maxDate,
  canQuery,
  hasAvailableRange,
  query,
  onFeedbackDateChange,
}) {
  const feedback = query.data;

  return (
    <section
      aria-labelledby="detail-report-tab"
      className="detail-tab-panel daily-feedback-report"
      id="detail-report-panel"
      role="tabpanel"
    >
      <header className="section-heading daily-feedback-report__heading">
        <div>
          <h2>AI 일일 피드백</h2>
          <p>수집된 재배 데이터를 바탕으로 생성된 날짜별 피드백입니다.</p>
        </div>
        <label className="daily-feedback-date-control">
          <span>
            <CalendarDays aria-hidden="true" />
            조회 날짜
          </span>
          <input
            aria-label="일일 피드백 조회 날짜"
            disabled={!hasAvailableRange}
            max={maxDate || undefined}
            min={minDate || undefined}
            type="date"
            value={feedbackDate || ""}
            onChange={(event) => onFeedbackDateChange?.(event.target.value)}
          />
        </label>
      </header>

      {!feedback ? (
        <article className="panel-card daily-feedback-state">
          <InlineQueryState
            canQuery={canQuery}
            hasAvailableRange={hasAvailableRange}
            query={query}
          />
        </article>
      ) : (
        <article className="panel-card daily-feedback-document">
          <header className="daily-feedback-document__header">
            <div>
              <p className="eyebrow">DAILY CULTIVATION REPORT</p>
              <h2>{formatLocalDate(feedback.feedbackDate || feedbackDate)} 일일 피드백</h2>
            </div>
            <FeedbackMeta feedback={feedback} feedbackDate={feedbackDate} />
          </header>
          <p className="daily-feedback-document__content">
            {feedback.content || "생성된 피드백 내용이 없습니다."}
          </p>
        </article>
      )}
    </section>
  );
}

export default function DailyFeedbackPanel({
  cultivationId,
  cultivationName,
  feedbackDate,
  minDate,
  maxDate,
  variant = "report",
  onFeedbackDateChange,
  onOpenReport,
}) {
  const hasAvailableRange = !minDate || !maxDate || minDate <= maxDate;
  const canQuery =
    Number.isFinite(cultivationId) &&
    cultivationId > 0 &&
    isDateInRange(feedbackDate, minDate, maxDate);
  const query = useQuery({
    queryKey: cultivationKeys.dailyFeedback(cultivationId, feedbackDate),
    queryFn: () => getDailyFeedback(cultivationId, feedbackDate),
    enabled: canQuery,
    retry: (failureCount, error) => error?.status !== 404 && failureCount < 1,
    staleTime: 300_000,
  });

  if (variant === "preview") {
    return (
      <PreviewPanel
        canQuery={canQuery}
        cultivationName={cultivationName}
        feedbackDate={feedbackDate}
        hasAvailableRange={hasAvailableRange}
        query={query}
        onOpenReport={onOpenReport}
      />
    );
  }

  return (
    <ReportPanel
      canQuery={canQuery}
      feedbackDate={feedbackDate}
      hasAvailableRange={hasAvailableRange}
      maxDate={maxDate}
      minDate={minDate}
      query={query}
      onFeedbackDateChange={onFeedbackDateChange}
    />
  );
}
