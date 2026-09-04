import {ChevronLeft, ChevronRight} from "lucide-react";

function visiblePages(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index);
  const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function AdminPagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="admin-pagination" aria-label="페이지 이동">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      {visiblePages(page, totalPages).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          className={pageNumber === page ? "is-active" : undefined}
          aria-current={pageNumber === page ? "page" : undefined}
          onClick={() => onChange(pageNumber)}
        >
          {pageNumber + 1}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
