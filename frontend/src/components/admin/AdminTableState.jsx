export default function AdminTableState({ colSpan, loading, error, empty, onRetry }) {
  let content = empty;
  if (loading) content = "목록을 불러오고 있습니다.";
  if (error) content = error.message || "목록을 불러오지 못했습니다.";
  return (
    <tr>
      <td className="admin-table-state" colSpan={colSpan}>
        <p>{content}</p>
        {error && onRetry && (
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        )}
      </td>
    </tr>
  );
}
