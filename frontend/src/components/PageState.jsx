export function LoadingState({ message = "데이터를 불러오고 있어요." }) {
  return (
    <div className="page-state" role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="page-state page-state--error" role="alert">
      <strong>화면을 불러오지 못했습니다.</strong>
      <p>{error?.message || "잠시 후 다시 시도해 주세요."}</p>
      {onRetry && (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="page-state page-state--empty">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
