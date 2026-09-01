import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { cultivationKeys, getCultivationListPage } from "../../api/cultivations";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState";
import CultivationCard from "../../features/cultivations/CultivationCard";
import { normalizeList } from "../../utils/formatters";

export default function CultivationListPage() {
  const listQuery = useQuery({
    queryKey: cultivationKeys.list(),
    queryFn: getCultivationListPage,
  });

  if (listQuery.isLoading) return <LoadingState message="나의 재배지를 불러오고 있어요." />;
  if (listQuery.isError) return <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />;

  const cultivations = normalizeList(listQuery.data?.cultivations);
  const mushrooms = new Map(
    normalizeList(listQuery.data?.mushrooms).map((mushroom) => [
      mushroom.id,
      mushroom.mushroomNameKo,
    ]),
  );

  return (
    <main className="workspace-page cultivation-list-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <div>
            <p className="eyebrow">오늘 관리할 재배지</p>
            <h1>나의 재배지</h1>
            <p>재배 상태와 등록된 센서 흐름을 한눈에 살펴보세요.</p>
          </div>
          <div className="page-heading__actions">
            <span className="summary-chip">
              전체 <strong>{cultivations.length}</strong>
            </span>
            <Link className="button button--primary" to="/cultivations/new">
              <Plus aria-hidden="true" /> 새 재배 시작
            </Link>
          </div>
        </header>
        <div className="section-caption">
          <span>사진 위 상태는 최신 센서값과 설정 범위를 기준으로 계산합니다.</span>
          <span>등록된 센서만 표시</span>
        </div>
        {cultivations.length === 0 ? (
          <EmptyState
            title="아직 재배지가 없습니다."
            description="첫 재배지를 만들고 센서 환경을 관리해 보세요."
            action={
              <Link className="button button--primary" to="/cultivations/new">
                새 재배 시작
              </Link>
            }
          />
        ) : (
          <div className="cultivation-list">
            {cultivations.map((cultivation) => (
              <CultivationCard
                key={cultivation.cultivationId}
                cultivation={cultivation}
                mushroomName={mushrooms.get(cultivation.mushroomId)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
