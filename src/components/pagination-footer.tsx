import * as RadixSelect from "@radix-ui/react-select";
import clsx from "clsx";

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
      <RadixSelect.Root
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <RadixSelect.Trigger
          className="radix-pagination-trigger"
          aria-label={labels.perPage}
        >
          <RadixSelect.Value
            placeholder={`${pageSize} ${labels.perPage}`}
            className="radix-pagination-value"
          />
          <RadixSelect.Icon className="radix-pagination-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5.5 7.5L10 12L14.5 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="radix-pagination-content"
            position="popper"
            sideOffset={6}
            align="start"
          >
            <RadixSelect.Viewport className="radix-pagination-viewport">
              {pageSizeOptions.map((size) => (
                <RadixSelect.Item
                  key={size}
                  value={String(size)}
                  className={clsx("radix-pagination-item")}
                >
                  <RadixSelect.ItemIndicator className="radix-pagination-item-indicator">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 10.5L8.5 15L16 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText className="radix-pagination-item-text">
                    {size} {labels.perPage}
                  </RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      <div className="pagination-controls">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {labels.previous}
        </button>
        <span>
          {labels.page} {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {labels.next}
        </button>
      </div>
    </footer>
  );
}
