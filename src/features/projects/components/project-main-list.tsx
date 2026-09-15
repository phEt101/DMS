import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import {
  FaArrowDownWideShort,
  FaFileLines,
  FaFolderOpen,
  FaList,
  FaMagnifyingGlass,
  FaPlus,
  FaTableCellsLarge,
} from "react-icons/fa6";
import { PaginationFooter } from "../../../components/pagination-footer";
import type { Translations } from "../../../locales";
import type { ApiProjectType, ProjectItem, ProjectTypeId } from "../page";
import { formatBytes } from "../page";
import { ProjectFilter, type ProjectFilters } from "./project-filter";
import { ProjectList } from "./project-list";

export function ProjectMainList(props: {
  translations: Translations;
  search: string;
  onSearch: (value: string) => void;
  projects: ProjectItem[];
  total: number;
  projectTypes: ApiProjectType[];
  typesLoading: boolean;
  typesError: string | null;
  onCreate: (id: ProjectTypeId) => void;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const p = props;
  const projectTranslations = p.translations.features.projects;
  return (
    <section className="dms-col-main">
      <p className="dms-kicker">{projectTranslations.kicker}</p>
      <div className="dms-title-row">
        <div className="dms-title-block">
          <h1>{projectTranslations.title}</h1>
          <div className="dms-subtitle">{projectTranslations.subtitle}</div>
        </div>
        <div className="dms-title-search-row">
          <div className="dms-search-wrap">
            <FaMagnifyingGlass className="dms-search-icon" />
            <input
              type="text"
              value={p.search}
              onChange={(event) => p.onSearch(event.target.value)}
              placeholder={projectTranslations.searchPlaceholder}
            />
          </div>
          <div className="dms-stats-group">
            <div className="dms-stats-pill">
              <FaFileLines />
              {p.total} {projectTranslations.projectCount}
            </div>
            <div className="dms-stats-pill">
              <FaFolderOpen />
              {formatBytes(
                p.projects.reduce(
                  (sum, project) => sum + project.sizeBytes,
                  0,
                ),
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="dms-toolbar-row">
        <RadixMenu.Root>
          <RadixMenu.Trigger asChild>
            <button className="dms-create-btn" type="button">
              <FaPlus />
              {projectTranslations.createProject}
            </button>
          </RadixMenu.Trigger>
          <RadixMenu.Portal>
            <RadixMenu.Content
              className="dms-create-dropdown"
              sideOffset={10}
              align="start"
              collisionPadding={16}
            >
              {p.typesLoading ? (
                <div className="dms-create-dropdown-state">
                  <div className="dms-create-dropdown-spinner" />
                  <span>{projectTranslations.loadingTypes}</span>
                </div>
              ) : p.typesError ? (
                <div className="dms-create-dropdown-state is-error">
                  <span className="dms-create-dropdown-error-title">
                    {projectTranslations.dropdownLoadError}
                  </span>
                  <span className="dms-create-dropdown-error-desc">
                    {p.typesError}
                  </span>
                </div>
              ) : !p.projectTypes.length ? (
                <div className="dms-create-dropdown-state">
                  <span>{projectTranslations.noActiveTypes}</span>
                </div>
              ) : (
                p.projectTypes.map((type) => (
                  <RadixMenu.Item
                    key={type.id}
                    className="dms-create-dropdown-item"
                    onSelect={() => p.onCreate(type.id)}
                  >
                    <span className="dms-create-dropdown-icon">
                      <FaFileLines />
                    </span>
                    <span className="dms-create-dropdown-name">
                      {type.name}
                    </span>
                  </RadixMenu.Item>
                ))
              )}
            </RadixMenu.Content>
          </RadixMenu.Portal>
        </RadixMenu.Root>
        <div className="dms-toolbar-actions">
          <button
            type="button"
            className={`dms-tool-btn ${p.sortOrder === "asc" ? "is-active" : ""}`}
            onClick={p.onToggleSort}
            title={p.sortOrder === "desc" ? projectTranslations.sortNewest : projectTranslations.sortOldest}
          >
            <FaArrowDownWideShort />
            {p.translations.common.labels.lastModified}
          </button>
          <ProjectFilter
            projectTranslations={projectTranslations}
            commonTranslations={p.translations.common}
            filters={p.filters}
            projectTypes={p.projectTypes}
            onApply={p.onFiltersChange}
          />
          <div className="dms-view-toggle">
            <button
              type="button"
              className={`dms-view-toggle-btn ${p.viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => p.onViewModeChange("grid")}
              title={projectTranslations.gridView}
            >
              <FaTableCellsLarge />
            </button>
            <button
              type="button"
              className={`dms-view-toggle-btn ${p.viewMode === "list" ? "is-active" : ""}`}
              onClick={() => p.onViewModeChange("list")}
              title={projectTranslations.listView}
            >
              <FaList />
            </button>
          </div>
        </div>
      </div>
      {p.loading ? (
        <div className="dms-project-list-state">{projectTranslations.loadingProjects}</div>
      ) : p.error ? (
        <div className="dms-project-list-state is-error">{p.error}</div>
      ) : (
        <ProjectList
          projectTranslations={projectTranslations}
          commonTranslations={p.translations.common}
          projects={p.projects}
          viewMode={p.viewMode}
          selectedId={p.selectedId}
          onSelect={p.onSelect}
          onOpen={p.onOpen}
          onEdit={p.onEdit}
          onDelete={p.onDelete}
        />
      )}
      {p.total > 0 && (
        <PaginationFooter
          page={p.page}
          pageSize={p.pageSize}
          total={p.total}
          labels={p.translations.common.pagination}
          onPageChange={p.onPageChange}
          onPageSizeChange={p.onPageSizeChange}
        />
      )}
      {p.total === 0 && (
        <div className="dms-project-empty">
          <FaFolderOpen />
          <div>{projectTranslations.emptyProjects}</div>
        </div>
      )}
    </section>
  );
}
