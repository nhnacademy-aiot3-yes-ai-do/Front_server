import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cultivationKeys, getCultivationListPage } from "../../api/cultivations";
import AdminPagination from "../../components/admin/AdminPagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState";
import CultivationCard from "../../features/cultivations/CultivationCard";
import { normalizeList } from "../../utils/formatters";

const PAGE_SIZE = 6;

export default function CultivationListPage() {
  const listQuery = useQuery({
    queryKey: cultivationKeys.list(),
    queryFn: getCultivationListPage,
  });
  const [page, setPage] = useState(0);

  const cultivations = normalizeList(listQuery.data?.cultivations);
  const totalPages = Math.max(1, Math.ceil(cultivations.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  if (listQuery.isLoading) return <LoadingState message="나의 재배지를 불러오고 있어요." />;
  if (listQuery.isError) return <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />;

  const mushrooms = new Map(
    normalizeList(listQuery.data?.mushrooms).map((mushroom) => [
      mushroom.id,
      mushroom.mushroomNameKo,
    ]),
  );
  const pagedCultivations = cultivations.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <main className="workspace-page cultivation-list-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <h1>나의 재배지</h1>
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
          <>
            <div className="cultivation-list">
              {pagedCultivations.map((cultivation) => (
                <CultivationCard
                  key={cultivation.cultivationId}
                  cultivation={cultivation}
                  mushroomName={mushrooms.get(cultivation.mushroomId)}
                />
              ))}
            </div>
            <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </main>
  );
}
