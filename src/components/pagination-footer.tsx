const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100] as const;

export function PaginationFooter({
  page,
  pageSize,
  total,
  labels,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  labels: { previous: string; next: string; page: string; perPage: string };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <footer className="users-pagination">
      <select
        aria-label={labels.perPage}
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size} {labels.perPage}
          </option>
        ))}
      </select>
      <div className="pagination-controls">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {labels.previous}
        </button>
        <span>{labels.page} {page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {labels.next}
        </button>
      </div>
    </footer>
  );
}
