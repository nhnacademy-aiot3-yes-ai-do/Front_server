import { useQueryClient } from "@tanstack/react-query";
import { Crown, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { jsonRequest, request } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { formatRole } from "../../utils/formatters";

export default function MemberManager({ cultivationId, members, myRole, onClose }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const isOwner = myRole === "OWNER";

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["cultivations", "detail", cultivationId] });

  const search = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    setBusy(true);
    try {
      setResults(
        await request(
          `/cultivations/${cultivationId}/members/search?keyword=${encodeURIComponent(keyword.trim())}`,
        ),
      );
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (userId) => {
    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/members`, "POST", { userId });
      setResults((items) => items.filter((item) => item.userId !== userId));
      setNotice({ type: "success", message: "담당자를 추가했습니다." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`${member.nickname || member.email} 님을 재배지에서 제외할까요?`)) return;
    setBusy(true);
    try {
      await request(`/cultivations/${cultivationId}/members/${member.userId}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", message: "담당자를 제외했습니다." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member, role) => {
    const roleLabel = role === "MANAGER" ? "관리자로 변경" : "일반 멤버로 변경";
    if (!window.confirm(`${member.nickname} 님을 ${roleLabel}할까요?`)) return;
    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/members/${member.userId}`, "PUT", {
        role,
      });
      setNotice({ type: "success", message: "담당자 역할을 변경했습니다." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const transferOwnership = async (member) => {
    if (!window.confirm(`${member.nickname} 님에게 재배지 소유권을 이전할까요?`)) return;
    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/owner`, "PUT", {
        userId: member.userId,
      });
      setNotice({ type: "success", message: "소유권을 이전했습니다." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="담당자 관리" onClose={onClose}>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      {isOwner && (
        <form className="inline-search" onSubmit={search}>
          <label className="sr-only" htmlFor="member-keyword">
            이메일 또는 닉네임 검색
          </label>
          <input
            id="member-keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="이메일 또는 닉네임"
          />
          <button
            className="button button--secondary inline-search__submit"
            type="submit"
            aria-label="검색"
            disabled={busy}
          >
            <Search aria-hidden="true" />
          </button>
        </form>
      )}
      {results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <div key={result.userId}>
              <span>
                <strong>{result.nickname}</strong>
                <small>{result.email}</small>
              </span>
              <button type="button" onClick={() => addMember(result.userId)} disabled={busy}>
                추가
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="member-list">
        {members.map((member) => (
          <div className="member-row" key={member.userId}>
            <span className="avatar avatar--small">{(member.nickname || "?").slice(0, 1)}</span>
            <span>
              <strong>{member.nickname || member.email}</strong>
              <small>{formatRole(member.role)}</small>
            </span>
            {isOwner && member.role !== "OWNER" && (
              <span className="member-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={member.role === "MANAGER" ? "멤버로 변경" : "관리자로 변경"}
                  onClick={() =>
                    changeRole(member, member.role === "MANAGER" ? "MEMBER" : "MANAGER")
                  }
                  disabled={busy}
                >
                  <ShieldCheck aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`${member.nickname}에게 소유권 이전`}
                  onClick={() => transferOwnership(member)}
                  disabled={busy}
                >
                  <Crown aria-hidden="true" />
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label={`${member.nickname} 제외`}
                  onClick={() => removeMember(member)}
                  disabled={busy}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
