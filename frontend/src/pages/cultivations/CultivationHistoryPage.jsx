import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../../api/http";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState";
import { formatDate, formatProductGrade, normalizeList } from "../../utils/formatters";

const GRADE_TONE = { TOP: "warning", HIGH: "stable", MID: "waiting", LOW: "low" };

export default function CultivationHistoryPage() {
  const [page, setPage] = useState(0);
  const historyQuery = useQuery({
    queryKey: ["cultivation-history", page],
    queryFn: () => request(`/cultivations/history/data?page=${page}&size=12`),
  });

  if (historyQuery.isLoading) return <LoadingState message="재배 이력을 불러오고 있어요." />;
  if (historyQuery.isError)
    return <ErrorState error={historyQuery.error} onRetry={historyQuery.refetch} />;

  const history = historyQuery.data;
  const items = normalizeList(history.content);

  return (
    <main className="workspace-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <div>
            <p className="eyebrow">지난 재배 기록</p>
            <h1>재배 이력</h1>
            <p>종료한 재배의 수확량과 등급을 확인할 수 있습니다.</p>
          </div>
        </header>
        {items.length === 0 ? (
          <EmptyState
            title="종료한 재배가 없습니다."
            description="재배를 종료하면 여기에 기록됩니다."
          />
        ) : (
          <div className="history-grid">
            {items.map((item) => (
              <Link
                className="history-card"
                key={item.cultivationId}
                to={`/cultivations/${item.cultivationId}`}
              >
                <span className="status-badge status-badge--stable">종료</span>
                <h2>{item.name}</h2>
                <dl>
                  <div>
                    <dt>종료일</dt>
                    <dd>{formatDate(item.finishedAt)}</dd>
                  </div>
                  <div>
                    <dt>수확량</dt>
                    <dd>{item.harvestWeight != null ? `${item.harvestWeight}g` : "-"}</dd>
                  </div>
                  <div>
                    <dt>상품 점수</dt>
                    <dd>{item.productScore != null ? `${item.productScore}점` : "-"}</dd>
                  </div>
                  <div>
                    <dt>상품 등급</dt>
                    <dd>
                      {item.productGrade ? (
                        <span
                          className={`status-badge status-badge--${GRADE_TONE[item.productGrade] || "waiting"}`}
                        >
                          {formatProductGrade(item.productGrade)}
                        </span>
                      ) : (
                        "평가 전"
                      )}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        )}
        {history.totalPages > 1 && (
          <nav className="pagination" aria-label="재배 이력 페이지">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span>
              {page + 1} / {history.totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= history.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
