export default function Notice({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div className={`notice notice--${notice.type || "info"}`} role="status">
      <span>{notice.message}</span>
      {onDismiss && (
        <button type="button" aria-label="알림 닫기" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}
