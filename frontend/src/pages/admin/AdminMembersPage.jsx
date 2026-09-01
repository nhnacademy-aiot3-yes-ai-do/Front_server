import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, UserRoundCheck, UserRoundX } from "lucide-react";
import { useMemo, useState } from "react";
import { getAdminMembers } from "../../api/admin";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminTableState from "../../components/admin/AdminTableState";
import { formatDate } from "../../utils/formatters";

const PAGE_SIZE = 8;

export default function AdminMembersPage() {
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const membersQuery = useQuery({
    queryKey: ["admin", "members", status, page],
    queryFn: () => getAdminMembers({ status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const members = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return membersQuery.data?.content || [];
    return (membersQuery.data?.content || []).filter(
      (member) =>
        member.nickname?.toLowerCase().includes(term) || member.email?.toLowerCase().includes(term),
    );
  }, [membersQuery.data, search]);

  const changeStatus = (nextStatus) => {
    setStatus(nextStatus);
    setPage(0);
    setSearch("");
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="회원 관리"
        description="가입 회원과 탈퇴 회원의 계정 현황을 확인합니다."
      />
      <section className="admin-panel">
        <div className="admin-segmented" role="tablist" aria-label="회원 상태">
          <button
            type="button"
            role="tab"
            aria-selected={status === "active"}
            className={status === "active" ? "is-active" : undefined}
            onClick={() => changeStatus("active")}
          >
            <UserRoundCheck aria-hidden="true" /> 가입 회원
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={status === "withdrawn"}
            className={status === "withdrawn" ? "is-active" : undefined}
            onClick={() => changeStatus("withdrawn")}
          >
            <UserRoundX aria-hidden="true" /> 탈퇴 회원
          </button>
        </div>
        <div className="admin-table-toolbar">
          <p>
            전체 <strong>{membersQuery.data?.totalElements ?? "-"}</strong>명
          </p>
          <label className="admin-search">
            <span className="sr-only">현재 페이지 회원 검색</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="이름 또는 이메일"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <p className="admin-helper-text">검색은 현재 불러온 페이지의 회원을 대상으로 합니다.</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>회원</th>
                <th>이메일</th>
                <th>가입일</th>
                <th>{status === "active" ? "최근 로그인" : "탈퇴일"}</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {(membersQuery.isLoading || membersQuery.isError || members.length === 0) && (
                <AdminTableState
                  colSpan={5}
                  loading={membersQuery.isLoading}
                  error={membersQuery.error}
                  empty="조건에 맞는 회원이 없습니다."
                  onRetry={membersQuery.refetch}
                />
              )}
              {!membersQuery.isLoading &&
                !membersQuery.isError &&
                members.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <div className="admin-user-cell">
                        <span aria-hidden="true">{member.nickname?.slice(0, 1) || "회"}</span>
                        <strong>{member.nickname || "이름 없음"}</strong>
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>
                      {formatDate(status === "active" ? member.lastLoginAt : member.deletedAt)}
                    </td>
                    <td>
                      <span
                        className={`admin-status admin-status--${status === "active" ? "active" : "deleted"}`}
                      >
                        {status === "active" ? "활성" : "탈퇴"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={membersQuery.data?.number || page}
          totalPages={membersQuery.data?.totalPages || 1}
          onChange={setPage}
        />
      </section>
    </div>
  );
}
