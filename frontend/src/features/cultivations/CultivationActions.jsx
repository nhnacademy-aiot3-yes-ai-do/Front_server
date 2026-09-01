import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { backendUrl, jsonRequest, request } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { formatDate, normalizeList } from "../../utils/formatters";

export default function CultivationActions({ cultivation, growthDays, pastCultivations, onClose }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("actions");
  const [harvestWeight, setHarvestWeight] = useState(null);
  const [comparisonId, setComparisonId] = useState("");
  const navigate = useNavigate();
  const id = cultivation.cultivationId;
  const isOwner = cultivation.myRole === "OWNER";
  const canSwitchMode = cultivation.myRole === "OWNER" || cultivation.myRole === "MANAGER";
  const histories = normalizeList(pastCultivations);
  const comparison = histories.find((item) => String(item.cultivationId) === comparisonId);

  const switchMode = async () => {
    if (!window.confirm("수확 모드로 전환하면 재배 모드로 되돌릴 수 없습니다. 전환할까요?")) {
      return;
    }
    setBusy(true);
    try {
      await request(`/cultivations/${id}/harvest-mode`, { method: "PUT" });
      window.location.reload();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  const recordHarvest = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const weight = Number(values.get("harvestWeight"));
    if (!Number.isFinite(weight) || weight < 0) {
      setNotice({ type: "error", message: "수확량은 0 이상의 숫자로 입력해 주세요." });
      return;
    }

    setBusy(true);
    try {
      const response = await jsonRequest(`/cultivations/${id}/harvest`, "POST", {
        harvestWeight: weight,
        memo: String(values.get("memo")).trim(),
      });
      setHarvestWeight(Number(response?.harvestWeight ?? weight));
      setComparisonId(histories[0] ? String(histories[0].cultivationId) : "");
      setNotice({ type: "success", message: "최종 수확량을 기록했습니다." });
      setView("finish");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const deleteCultivation = async () => {
    if (!window.confirm("재배지와 연결된 정보를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    setBusy(true);
    try {
      await request(`/cultivations/${id}`, { method: "DELETE" });
      navigate("/cultivations", { replace: true });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  return (
    <Modal title="재배지 관리" onClose={onClose} className="modal-card--wide">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {view === "actions" && (
        <div className="action-list">
          {canSwitchMode && cultivation.mode !== "HARVEST" && (
            <button
              className="button button--secondary"
              type="button"
              onClick={switchMode}
              disabled={busy}
            >
              수확 모드로 전환
            </button>
          )}
          {isOwner && cultivation.mode === "HARVEST" && (
            <button
              className="button button--primary"
              type="button"
              onClick={() => setView("harvest")}
              disabled={busy}
            >
              수확 기록 후 재배 종료
            </button>
          )}
          {isOwner && (
            <button
              className="button button--danger"
              type="button"
              onClick={deleteCultivation}
              disabled={busy}
            >
              재배지 삭제
            </button>
          )}
          {!isOwner && cultivation.mode === "HARVEST" && (
            <p className="modal-empty">재배 종료와 삭제는 소유자만 할 수 있습니다.</p>
          )}
        </div>
      )}

      {view === "harvest" && (
        <form className="form-stack" onSubmit={recordHarvest}>
          <p>이번 재배의 최종 수확량을 기록한 뒤 종료할 수 있습니다.</p>
          <label>
            최종 수확량 (g)
            <input name="harvestWeight" type="number" min="0" step="any" required />
          </label>
          <label>
            재배 메모
            <textarea name="memo" rows="4" maxLength="1000" />
          </label>
          <div className="form-actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setView("actions")}
            >
              이전
            </button>
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? "기록 중…" : "수확량 기록"}
            </button>
          </div>
        </form>
      )}

      {view === "finish" && (
        <section className="harvest-summary">
          <div className="harvest-summary__current">
            <div>
              <span>총 재배기간</span>
              <strong>{growthDays == null ? "-" : `${growthDays}일`}</strong>
            </div>
            <div>
              <span>이번 수확량</span>
              <strong>{harvestWeight}g</strong>
            </div>
          </div>
          {histories.length > 0 ? (
            <div className="history-comparison">
              <label>
                비교할 이전 재배
                <select
                  value={comparisonId}
                  onChange={(event) => setComparisonId(event.target.value)}
                >
                  {histories.map((history) => (
                    <option key={history.cultivationId} value={history.cultivationId}>
                      {history.name} · {formatDate(history.finishedAt)}
                    </option>
                  ))}
                </select>
              </label>
              {comparison && (
                <p>
                  이전 수확량 <strong>{comparison.harvestWeight ?? 0}g</strong> 대비
                  <strong>
                    {harvestWeight - Number(comparison.harvestWeight || 0) >= 0 ? " +" : " "}
                    {harvestWeight - Number(comparison.harvestWeight || 0)}g
                  </strong>
                </p>
              )}
            </div>
          ) : (
            <p className="modal-empty">비교할 이전 재배 이력이 없습니다.</p>
          )}
          <p className="modal-help">
            환경 평균과 AI 종료 리포트는 공개 API가 없어 임의 값 없이 표시하지 않습니다.
          </p>
          <form method="post" action={backendUrl(`/cultivations/${id}/finish`)}>
            <button className="button button--primary button--wide" type="submit">
              재배 종료
            </button>
          </form>
        </section>
      )}
    </Modal>
  );
}
