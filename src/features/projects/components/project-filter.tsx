import { useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { FaFilter } from "react-icons/fa6";

export interface ProjectFilters {
  status: "" | "draft" | "approved" | "archived" | "trash";
  projectTypeId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  status: "",
  projectTypeId: "",
  dateFrom: "",
  dateTo: "",
};

function FilterSelect({
  value,
  allLabel,
  ariaLabel,
  options,
  onChange,
}: {
  value: string;
  allLabel: string;
  ariaLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <RadixSelect.Root
      value={value || "all"}
      onValueChange={(next) => onChange(next === "all" ? "" : next)}
    >
      <RadixSelect.Trigger
        className="radix-pagination-trigger dms-filter-select-trigger"
        aria-label={ariaLabel}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon className="radix-pagination-icon" aria-hidden="true">
          ⌄
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="radix-pagination-content dms-filter-select-content"
          position="popper"
          sideOffset={6}
          align="start"
        >
          <RadixSelect.Viewport className="radix-pagination-viewport">
            {[{ value: "all", label: allLabel }, ...options].map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="radix-pagination-item"
              >
                <RadixSelect.ItemIndicator className="radix-pagination-item-indicator">
                  ✓
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText className="radix-pagination-item-text">
                  {option.label}
                </RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

export function ProjectFilter({
  filters,
  projectTypes,
  onApply,
}: {
  filters: ProjectFilters;
  projectTypes: Array<{ id: number; name: string }>;
  onApply: (filters: ProjectFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="dms-filter-wrap">
      <button
        type="button"
        className={`dms-tool-btn ${activeCount ? "is-active" : ""}`}
        onClick={() => {
          setDraft(filters);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-controls="projects-filter-panel"
      >
        <FaFilter /> Filter{activeCount ? ` (${activeCount})` : ""}
      </button>
      {open && (
        <form
          id="projects-filter-panel"
          className="dms-filter-panel"
          onSubmit={(event) => {
            event.preventDefault();
            onApply(draft);
            setOpen(false);
          }}
        >
          <label className="dms-filter-field">
            <span>สถานะ</span>
            <FilterSelect
              value={draft.status}
              ariaLabel="สถานะ"
              allLabel="ทุกสถานะ"
              options={[
                { value: "draft", label: "วางแผน" },
                { value: "approved", label: "เริ่มดำเนินงานตามแผนที่วาง" },
                { value: "archived", label: "เสร็จสิ้น" },
              ]}
              onChange={(status) =>
                setDraft((value) => ({
                  ...value,
                  status: status as ProjectFilters["status"],
                }))
              }
            />
          </label>
          <label className="dms-filter-field">
            <span>ประเภทเอกสาร</span>
            <FilterSelect
              value={draft.projectTypeId}
              ariaLabel="ประเภทเอกสาร"
              allLabel="ทุกประเภท"
              options={projectTypes.map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              onChange={(projectTypeId) =>
                setDraft((value) => ({ ...value, projectTypeId }))
              }
            />
          </label>
          <div className="dms-filter-date-row">
            <label className="dms-filter-field">
              <span>วันที่แก้ไข ตั้งแต่</span>
              <input
                type="date"
                value={draft.dateFrom}
                max={draft.dateTo || undefined}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </label>
            <label className="dms-filter-field">
              <span>ถึงวันที่</span>
              <input
                type="date"
                value={draft.dateTo}
                min={draft.dateFrom || undefined}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    dateTo: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="dms-filter-actions">
            <button
              type="button"
              className="dms-filter-reset"
              onClick={() => {
            setDraft(EMPTY_PROJECT_FILTERS);
            onApply(EMPTY_PROJECT_FILTERS);
                setOpen(false);
              }}
            >
              ล้างตัวกรอง
            </button>
            <button type="submit" className="dms-filter-apply">
              ใช้ตัวกรอง
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
