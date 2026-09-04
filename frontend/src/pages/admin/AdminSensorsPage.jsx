import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Pencil, Plus, Trash2} from "lucide-react";
import {useState} from "react";
import {deleteAdminSensorType, getAdminSensorTypes, saveAdminSensorType} from "../../api/admin";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminTableState from "../../components/admin/AdminTableState";

const PAGE_SIZE = 8;

function SensorFormModal({ sensorType, onClose }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState(sensorType?.type || "");
  const [valueUnit, setValueUnit] = useState(sensorType?.valueUnit || "");
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: saveAdminSensorType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sensor-types"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      id: sensorType?.id,
      type: type.trim().toUpperCase(),
      valueUnit: valueUnit.trim(),
    });
  };

  return (
    <Modal title={sensorType ? "센서 타입 수정" : "새 센서 타입 등록"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <p>재배지 센서 등록 화면에서 사용할 측정 타입과 단위를 입력하세요.</p>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <label>
          측정 타입
          <input
            type="text"
            value={type}
            required
            maxLength="50"
            placeholder="예: TEMPERATURE"
            onChange={(event) => setType(event.target.value)}
          />
          <small>영문 대문자 형식을 권장합니다.</small>
        </label>
        <label>
          단위
          <input
            type="text"
            value={valueUnit}
            required
            maxLength="20"
            placeholder="예: °C"
            onChange={(event) => setValueUnit(event.target.value)}
          />
        </label>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="admin-primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteSensorModal({ sensorType, onClose }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: () => deleteAdminSensorType(sensorType.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sensor-types"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title="센서 타입 삭제" onClose={onClose}>
      <div className="admin-confirm">
        <p>
          <strong>{sensorType.type}</strong> 센서 타입을 삭제하시겠습니까?
        </p>
        <span>사용 중인 센서 또는 버섯 기준정보가 있으면 삭제되지 않을 수 있습니다.</span>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button
            className="admin-danger-button"
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminSensorsPage() {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const sensorTypesQuery = useQuery({
    queryKey: ["admin", "sensor-types"],
    queryFn: getAdminSensorTypes,
  });
  const sensorTypes = sensorTypesQuery.data || [];
  const totalPages = Math.max(1, Math.ceil(sensorTypes.length / PAGE_SIZE));
  const pageItems = sensorTypes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="센서 타입"
        description="센서가 측정하는 항목과 표시 단위를 관리합니다."
        action={
          <button className="admin-primary-button" type="button" onClick={() => setEditing(null)}>
            <Plus aria-hidden="true" /> 새 센서 타입
          </button>
        }
      />
      <section className="admin-panel">
        <div className="admin-table-toolbar">
          <p>
            전체 <strong>{sensorTypes.length}</strong>개
          </p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>측정 타입</th>
                <th>단위</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(sensorTypesQuery.isLoading ||
                sensorTypesQuery.isError ||
                pageItems.length === 0) && (
                <AdminTableState
                  colSpan={3}
                  loading={sensorTypesQuery.isLoading}
                  error={sensorTypesQuery.error}
                  empty="등록된 센서 타입이 없습니다."
                  onRetry={sensorTypesQuery.refetch}
                />
              )}
              {!sensorTypesQuery.isLoading &&
                !sensorTypesQuery.isError &&
                pageItems.map((sensorType) => (
                  <tr key={sensorType.id}>
                    <td className="admin-table-title">{sensorType.type}</td>
                    <td>{sensorType.valueUnit}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          aria-label="센서 타입 수정"
                          onClick={() => setEditing(sensorType)}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="센서 타입 삭제"
                          onClick={() => setDeleting(sensorType)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>
      {editing !== undefined && (
        <SensorFormModal sensorType={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && <DeleteSensorModal sensorType={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
