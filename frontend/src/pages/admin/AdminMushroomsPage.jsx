import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  deleteAdminMushroom,
  getAdminMushrooms,
  getAdminSensorTypes,
  saveAdminMushroom,
} from "../../api/admin";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminTableState from "../../components/admin/AdminTableState";
import { formatDate, formatSensorType } from "../../utils/formatters";

const PAGE_SIZE = 8;

function thresholdKey(sensorTypeId, thresholdType) {
  return `${thresholdType}:${sensorTypeId}`;
}

function initialRanges(mushroom) {
  return Object.fromEntries(
    (mushroom?.thresholdInfoResponses || []).map((threshold) => [
      thresholdKey(threshold.sensorType.id, threshold.thresholdType),
      {
        id: threshold.id,
        min: String(threshold.thresholdMin ?? ""),
        max: String(threshold.thresholdMax ?? ""),
      },
    ]),
  );
}

function displayRange(mushroom, sensorTypeId) {
  const threshold = mushroom.thresholdInfoResponses?.find(
    (item) => item.thresholdType === "GROWTH" && item.sensorType?.id === sensorTypeId,
  );
  if (!threshold) return "-";
  return `${threshold.thresholdMin}–${threshold.thresholdMax}${threshold.sensorType.valueUnit}`;
}

function MushroomFormModal({ mushroom, sensorTypes, onClose }) {
  const queryClient = useQueryClient();
  const [nameKo, setNameKo] = useState(mushroom?.mushroomNameKo || "");
  const [nameEn, setNameEn] = useState(mushroom?.mushroomNameEn || "");
  const [scientificName, setScientificName] = useState(mushroom?.mushroomScientificName || "");
  const [ranges, setRanges] = useState(() => initialRanges(mushroom));
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: saveAdminMushroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "mushrooms"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });

  const setRangeValue = (sensorTypeId, thresholdType, field, value) => {
    const key = thresholdKey(sensorTypeId, thresholdType);
    setRanges((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const thresholds = [];
    for (const thresholdType of ["GROWTH", "HARVEST"]) {
      for (const sensorType of sensorTypes) {
        const range = ranges[thresholdKey(sensorType.id, thresholdType)] || {};
        const hasMin = range.min !== undefined && range.min !== "";
        const hasMax = range.max !== undefined && range.max !== "";
        if (hasMin !== hasMax) {
          setNotice({
            type: "error",
            message: `${formatSensorType(sensorType.type)}의 최소값과 최대값을 모두 입력해 주세요.`,
          });
          return;
        }
        if (!hasMin) continue;
        if (Number(range.min) > Number(range.max)) {
          setNotice({
            type: "error",
            message: `${formatSensorType(sensorType.type)}의 최소값은 최대값보다 클 수 없습니다.`,
          });
          return;
        }
        thresholds.push({
          id: range.id || null,
          sensorTypeId: sensorType.id,
          thresholdType,
          thresholdMin: Number(range.min),
          thresholdMax: Number(range.max),
        });
      }
    }
    if (!thresholds.length) {
      setNotice({ type: "error", message: "생육 환경 범위를 하나 이상 입력해 주세요." });
      return;
    }
    mutation.mutate({
      id: mushroom?.id,
      payload: {
        mushroomNameKo: nameKo.trim(),
        mushroomNameEn: nameEn.trim(),
        mushroomScientificName: scientificName.trim(),
        thresholds,
      },
    });
  };

  return (
    <Modal
      title={mushroom ? "버섯 기준정보 수정" : "새 버섯 기준정보"}
      onClose={onClose}
      className="admin-mushroom-modal"
    >
      <form className="admin-form" onSubmit={submit}>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <div className="admin-form-grid admin-form-grid--three">
          <label>
            국문명
            <input value={nameKo} required onChange={(event) => setNameKo(event.target.value)} />
          </label>
          <label>
            영문명
            <input value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
          </label>
          <label>
            학명
            <input
              value={scientificName}
              onChange={(event) => setScientificName(event.target.value)}
            />
          </label>
        </div>
        {[
          { key: "GROWTH", label: "재배기 적정 범위" },
          { key: "HARVEST", label: "수확기 적정 범위" },
        ].map((section) => (
          <fieldset className="admin-threshold-fieldset" key={section.key}>
            <legend>{section.label}</legend>
            <div className="admin-threshold-grid">
              {sensorTypes.map((sensorType) => {
                const range = ranges[thresholdKey(sensorType.id, section.key)] || {};
                return (
                  <div key={sensorType.id} className="admin-threshold-row">
                    <span>
                      {formatSensorType(sensorType.type)} ({sensorType.valueUnit})
                    </span>
                    <label>
                      <span className="sr-only">최소값</span>
                      <input
                        type="number"
                        step="any"
                        value={range.min || ""}
                        placeholder="최소"
                        onChange={(event) =>
                          setRangeValue(sensorType.id, section.key, "min", event.target.value)
                        }
                      />
                    </label>
                    <span>–</span>
                    <label>
                      <span className="sr-only">최대값</span>
                      <input
                        type="number"
                        step="any"
                        value={range.max || ""}
                        placeholder="최대"
                        onChange={(event) =>
                          setRangeValue(sensorType.id, section.key, "max", event.target.value)
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
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

function DeleteMushroomModal({ mushroom, onClose }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: () => deleteAdminMushroom(mushroom.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "mushrooms"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title="버섯 기준정보 삭제" onClose={onClose}>
      <div className="admin-confirm">
        <p>
          <strong>{mushroom.mushroomNameKo}</strong> 기준정보를 삭제하시겠습니까?
        </p>
        <span>삭제 후에는 새 재배지에서 이 버섯을 선택할 수 없습니다.</span>
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

export default function AdminMushroomsPage() {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const mushroomsQuery = useQuery({ queryKey: ["admin", "mushrooms"], queryFn: getAdminMushrooms });
  const sensorTypesQuery = useQuery({
    queryKey: ["admin", "sensor-types"],
    queryFn: getAdminSensorTypes,
  });
  const mushrooms = mushroomsQuery.data || [];
  const totalPages = Math.max(1, Math.ceil(mushrooms.length / PAGE_SIZE));
  const pageItems = mushrooms.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const sensorTypes = sensorTypesQuery.data || [];
  const canCreate = sensorTypes.length > 0;
  const loading = mushroomsQuery.isLoading || sensorTypesQuery.isLoading;
  const error = mushroomsQuery.error || sensorTypesQuery.error;
  const sensorColumns = sensorTypes.filter((sensorType) =>
    ["TEMPERATURE", "HUMIDITY"].includes(sensorType.type),
  );

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="버섯 기준정보"
        description="재배 가능한 버섯과 생육·수확 환경 범위를 관리합니다."
        action={
          <button
            className="admin-primary-button"
            type="button"
            disabled={!canCreate}
            title={!canCreate ? "센서 타입을 먼저 등록해 주세요." : undefined}
            onClick={() => setEditing(null)}
          >
            <Plus aria-hidden="true" /> 새 버섯 등록
          </button>
        }
      />
      <section className="admin-panel">
        <div className="admin-table-toolbar">
          <p>
            전체 <strong>{mushrooms.length}</strong>종
          </p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>국문명</th>
                <th>영문명</th>
                <th>학명</th>
                {sensorColumns.map((sensorType) => (
                  <th key={sensorType.id}>
                    {formatSensorType(sensorType.type)} ({sensorType.valueUnit})
                  </th>
                ))}
                <th>등록일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(loading || error || pageItems.length === 0) && (
                <AdminTableState
                  colSpan={5 + sensorColumns.length}
                  loading={loading}
                  error={error}
                  empty="등록된 버섯 기준정보가 없습니다."
                  onRetry={() => {
                    mushroomsQuery.refetch();
                    sensorTypesQuery.refetch();
                  }}
                />
              )}
              {!loading &&
                !error &&
                pageItems.map((mushroom) => (
                  <tr key={mushroom.id}>
                    <td className="admin-table-title">{mushroom.mushroomNameKo}</td>
                    <td>{mushroom.mushroomNameEn || "-"}</td>
                    <td className="admin-scientific-name">
                      {mushroom.mushroomScientificName || "-"}
                    </td>
                    {sensorColumns.map((sensorType) => (
                      <td key={sensorType.id}>{displayRange(mushroom, sensorType.id)}</td>
                    ))}
                    <td>{formatDate(mushroom.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          aria-label="버섯 수정"
                          onClick={() => setEditing(mushroom)}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="버섯 삭제"
                          onClick={() => setDeleting(mushroom)}
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
        <MushroomFormModal
          mushroom={editing}
          sensorTypes={sensorTypes}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && <DeleteMushroomModal mushroom={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
