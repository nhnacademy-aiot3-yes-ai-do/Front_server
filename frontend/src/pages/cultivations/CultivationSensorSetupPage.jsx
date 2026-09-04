import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  cultivationKeys,
  deleteCultivation,
  getCultivationSetupPage,
} from "../../api/cultivations";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import CultivationCreationStepper from "../../features/cultivations/CultivationCreationStepper";
import CultivationSensorSetupStep from "../../features/cultivations/CultivationSensorSetupStep";
import { normalizeList } from "../../utils/formatters";

export default function CultivationSensorSetupPage() {
  const { cultivationId } = useParams();
  const id = Number(cultivationId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setupQuery = useQuery({
    queryKey: cultivationKeys.setup(id),
    queryFn: () => getCultivationSetupPage(id),
    enabled: Number.isFinite(id),
  });
  const [newlyRegisteredSensors, setNewlyRegisteredSensors] = useState([]);
  const [notice, setNotice] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (setupQuery.isLoading) return <LoadingState message="센서 설정을 불러오고 있어요." />;
  if (setupQuery.isError)
    return <ErrorState error={setupQuery.error} onRetry={setupQuery.refetch} />;
  if (!setupQuery.data?.cultivation) {
    return (
      <ErrorState
        error={new Error("재배지 정보를 불러오지 못했습니다.")}
        onRetry={setupQuery.refetch}
      />
    );
  }

  const cultivation = setupQuery.data.cultivation;
  const savedSensors = normalizeList(setupQuery.data?.sensors?.sensors);
  const environmentSettings = normalizeList(setupQuery.data?.sensors?.environmentSettings);
  const registeredSensors = [...savedSensors, ...newlyRegisteredSensors].filter(
    (sensor, index, sensors) =>
      sensors.findIndex(
        (candidate) =>
          String(candidate.deviceEui).trim().toLowerCase() ===
          String(sensor.deviceEui).trim().toLowerCase(),
      ) === index,
  );

  const handleSensorRegistered = async (sensor) => {
    setNewlyRegisteredSensors((current) => [...current, sensor]);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: cultivationKeys.setup(id) }),
      queryClient.invalidateQueries({ queryKey: cultivationKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: cultivationKeys.preview(id) }),
      queryClient.invalidateQueries({ queryKey: cultivationKeys.list() }),
      queryClient.invalidateQueries({ queryKey: ["reusable-sensors", id] }),
    ]);
  };

  const completeSetup = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: cultivationKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: cultivationKeys.preview(id) }),
      queryClient.invalidateQueries({ queryKey: cultivationKeys.list() }),
    ]);
    navigate(`/cultivations/${id}`);
  };

  const deleteCurrentCultivation = async () => {
    if (!window.confirm("재배지와 연결된 정보를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setDeleting(true);
    setNotice(null);
    try {
      await deleteCultivation(id);
      queryClient.removeQueries({ queryKey: cultivationKeys.all });
      navigate("/cultivations", { replace: true });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setDeleting(false);
    }
  };

  return (
    <main className="workspace-page cultivation-create-page cultivation-setup-page">
      <section className="workspace-panel">
        <CultivationCreationStepper currentStep={3} />
        <section className="creation-stage sensor-setup-stage">
          <div className="creation-stage__heading">
            <span>3단계</span>
            <h1>센서 연결을 마쳐 주세요</h1>
            <p>기존 기기를 재사용하거나 새 기기를 등록할 수 있습니다.</p>
          </div>

          <div className="creation-success-banner" role="status">
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>{cultivation.name}가 생성되었습니다.</strong>
              <span>센서를 하나 이상 연결하면 재배지 대시보드를 사용할 수 있습니다.</span>
            </div>
          </div>

          <Notice notice={notice} onDismiss={() => setNotice(null)} />

          {registeredSensors.length > 0 && (
            <section className="setup-registered-sensors" aria-label="등록 완료 센서">
              <h2>등록 완료 센서</h2>
              {registeredSensors.map((sensor) => (
                <div key={`${sensor.deviceEui}-${sensor.deviceName}`}>
                  <CheckCircle2 aria-hidden="true" />
                  <span>
                    <strong>{sensor.deviceName}</strong>
                    <small>{sensor.deviceEui}</small>
                  </span>
                </div>
              ))}
            </section>
          )}

          <CultivationSensorSetupStep
            cultivationId={id}
            environmentSettings={environmentSettings}
            registeredSensors={registeredSensors}
            onRegistered={handleSensorRegistered}
          />

          <div className="form-actions form-actions--between">
            <div className="setup-secondary-actions">
              {cultivation.myRole === "OWNER" && (
                <button
                  className="button button--danger"
                  type="button"
                  onClick={deleteCurrentCultivation}
                  disabled={deleting}
                >
                  <Trash2 aria-hidden="true" /> {deleting ? "삭제 중..." : "재배지 삭제"}
                </button>
              )}
              <Link className="button button--secondary" to="/cultivations">
                나중에 계속하기
              </Link>
            </div>
            <button
              className="button button--primary"
              type="button"
              disabled={registeredSensors.length === 0 || deleting}
              onClick={completeSetup}
            >
              <Check aria-hidden="true" /> 재배지 설정 완료
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
