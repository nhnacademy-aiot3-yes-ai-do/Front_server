import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Search, UserRoundCheck, UserRoundX } from "lucide-react";
import { useMemo, useState } from "react";
import {
  forceWithdrawAdminMember,
  getAdminMembers,
  releaseDormantAdminMember,
} from "../../api/admin";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminTableState from "../../components/admin/AdminTableState";
import { formatDate } from "../../utils/formatters";

const PAGE_SIZE = 8;

const memberStatuses = {
  active: { label: "활성", badge: "active" },
  dormant: { label: "휴면", badge: "dormant" },
  withdrawn: { label: "탈퇴", badge: "deleted" },
};

function MemberActionModal({ action, member, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const isRelease = action === "release";
  const mutation = useMutation({
    mutationFn: () =>
      isRelease
        ? releaseDormantAdminMember(member.userId)
        : forceWithdrawAdminMember(member.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      onSuccess(isRelease ? "휴면 계정을 해제했습니다." : "회원을 강제 탈퇴 처리했습니다.");
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });

  return (
    <Modal title={isRelease ? "휴면 계정 해제" : "회원 강제 탈퇴"} onClose={onClose}>
      <div className="admin-confirm">
        <p>
          <strong>{member.nickname || member.email}</strong> 회원의
          {isRelease ? " 휴면 상태를 해제하시겠습니까?" : " 계정을 강제 탈퇴 처리하시겠습니까?"}
        </p>
        <span>
          {isRelease
            ? "해제 후 회원은 다시 로그인할 수 있습니다."
            : "강제 탈퇴는 되돌릴 수 없으므로 회원 정보를 다시 확인해 주세요."}
        </span>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button
            className={isRelease ? "admin-primary-button" : "admin-danger-button"}
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "처리 중…" : isRelease ? "휴면 해제" : "강제 탈퇴"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminMembersPage() {
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [memberAction, setMemberAction] = useState(null);
  const [notice, setNotice] = useState(null);
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
        description="활성·휴면·탈퇴 회원의 계정 상태를 확인하고 관리합니다."
      />
      <section className="admin-panel">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
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
            aria-selected={status === "dormant"}
            className={status === "dormant" ? "is-active" : undefined}
            onClick={() => changeStatus("dormant")}
          >
            <Moon aria-hidden="true" /> 휴면 회원
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
                <th>{status === "withdrawn" ? "탈퇴일" : "최근 로그인"}</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(membersQuery.isLoading || membersQuery.isError || members.length === 0) && (
                <AdminTableState
                  colSpan={6}
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
                      {formatDate(status === "withdrawn" ? member.deletedAt : member.lastLoginAt)}
                    </td>
                    <td>
                      <span
                        className={`admin-status admin-status--${memberStatuses[status].badge}`}
                      >
                        {memberStatuses[status].label}
                      </span>
                    </td>
                    <td>
                      <div className="admin-member-actions">
                        {status === "dormant" && (
                          <button
                            className="admin-member-release-button"
                            type="button"
                            onClick={() => setMemberAction({ action: "release", member })}
                          >
                            휴면 해제
                          </button>
                        )}
                        {status !== "withdrawn" && (
                          <button
                            className="admin-member-withdraw-button"
                            type="button"
                            onClick={() => setMemberAction({ action: "withdraw", member })}
                          >
                            강제 탈퇴
                          </button>
                        )}
                        {status === "withdrawn" && <span aria-label="관리 작업 없음">-</span>}
                      </div>
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
      {memberAction && (
        <MemberActionModal
          action={memberAction.action}
          member={memberAction.member}
          onClose={() => setMemberAction(null)}
          onSuccess={(message) => {
            setNotice({ type: "success", message });
            setMemberAction(null);
          }}
        />
      )}
    </div>
  );
}
