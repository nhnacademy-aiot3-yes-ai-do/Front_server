import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCultivation } from "../../api/cultivations";
import { request } from "../../api/http";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import { formatSensorType, normalizeList } from "../../utils/formatters";

export default function CultivationCreatePage() {
  const [mushroomId, setMushroomId] = useState("");
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const referencesQuery = useQuery({
    queryKey: ["mushroom-references"],
    queryFn: () => request("/cultivations/mushroom-references"),
  });
  const mushrooms = normalizeList(referencesQuery.data?.mushroomReferenceInfoResponses);
  const selectedMushroom = mushrooms.find((mushroom) => String(mushroom.id) === mushroomId);
  const thresholds = useMemo(
    () =>
      normalizeList(selectedMushroom?.thresholdInfoResponses).filter(
        (threshold) => !threshold.thresholdType || threshold.thresholdType === "GROWTH",
      ),
    [selectedMushroom],
  );

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const environmentSettingRequests = thresholds.map((threshold) => ({
      sensorTypeId: threshold.sensorType.id,
      thresholdMin: Number(form.get(`min-${threshold.sensorType.id}`)),
      thresholdMax: Number(form.get(`max-${threshold.sensorType.id}`)),
    }));
    setSubmitting(true);
    try {
      await createCultivation({
        name: String(form.get("name")).trim(),
        mushroomId: Number(mushroomId),
        environmentSettingRequests,
      });
      navigate("/cultivations");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setSubmitting(false);
    }
  };

  if (referencesQuery.isLoading) return <LoadingState message="버섯 기준정보를 불러오고 있어요." />;
  if (referencesQuery.isError)
    return <ErrorState error={referencesQuery.error} onRetry={referencesQuery.refetch} />;

  return (
    <main className="workspace-page">
      <section className="workspace-panel form-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">새로운 재배 시작</p>
            <h1>재배지 만들기</h1>
            <p>버섯을 선택하면 등록된 권장 환경을 기본값으로 사용합니다.</p>
          </div>
        </header>
        <Notice notice={notice} />
        <form className="form-stack form-stack--roomy" onSubmit={submit}>
          <label>
            재배지 이름
            <input name="name" maxLength="100" required />
          </label>
          <label>
            버섯 종류
            <select
              value={mushroomId}
              onChange={(event) => setMushroomId(event.target.value)}
              required
            >
              <option value="">버섯을 선택하세요</option>
              {mushrooms.map((mushroom) => (
                <option key={mushroom.id} value={mushroom.id}>
                  {mushroom.mushroomNameKo}
                </option>
              ))}
            </select>
          </label>
          {selectedMushroom && (
            <section className="reference-card">
              <h2>{selectedMushroom.mushroomNameKo} 권장 재배 환경</h2>
              <div className="threshold-grid">
                {thresholds.map((threshold) => (
                  <fieldset key={threshold.sensorType.id}>
                    <legend>{formatSensorType(threshold.sensorType.type)}</legend>
                    <label>
                      최소값
                      <input
                        name={`min-${threshold.sensorType.id}`}
                        type="number"
                        step="any"
                        defaultValue={threshold.thresholdMin}
                        required
                      />
                    </label>
                    <label>
                      최대값 ({threshold.sensorType.valueUnit})
                      <input
                        name={`max-${threshold.sensorType.id}`}
                        type="number"
                        step="any"
                        defaultValue={threshold.thresholdMax}
                        required
                      />
                    </label>
                  </fieldset>
                ))}
              </div>
            </section>
          )}
          <div className="form-actions">
            <button className="button button--secondary" type="button" onClick={() => navigate(-1)}>
              취소
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={submitting || !mushroomId}
            >
              {submitting ? "생성 중…" : "재배 시작"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
