import { useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { FaFilter } from "react-icons/fa6";
import type { CommonTranslations, ProjectTranslations } from "../page";

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
  projectTranslations,
  commonTranslations,
  filters,
  projectTypes,
  onApply,
}: {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
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
            <span>{commonTranslations.labels.status}</span>
            <FilterSelect
              value={draft.status}
              ariaLabel={commonTranslations.labels.status}
              allLabel={projectTranslations.filter.allStatuses}
              options={[
                { value: "draft", label: projectTranslations.status.planning },
                { value: "approved", label: projectTranslations.status.active },
                { value: "archived", label: projectTranslations.status.completed },
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
            <span>{projectTranslations.filter.projectType}</span>
            <FilterSelect
              value={draft.projectTypeId}
              ariaLabel={projectTranslations.filter.projectType}
              allLabel={projectTranslations.filter.allTypes}
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
              <span>{projectTranslations.filter.dateFrom}</span>
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
              <span>{projectTranslations.filter.dateTo}</span>
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
              {projectTranslations.filter.clear}
            </button>
            <button type="submit" className="dms-filter-apply">
              {projectTranslations.filter.apply}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
