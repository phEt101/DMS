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
import type { ApiDocumentType, DocItem, DocumentTypeId } from "../page";
import { formatBytes } from "../page";
import { DocumentFilter, type DocumentFilters } from "./document-filter";
import { DocumentList } from "./document-list";

export function DocumentMainList(props: {
  translations: Translations;
  search: string;
  onSearch: (value: string) => void;
  documents: DocItem[];
  total: number;
  documentTypes: ApiDocumentType[];
  typesLoading: boolean;
  typesError: string | null;
  onCreate: (id: DocumentTypeId) => void;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onEdit: (document: DocItem) => void;
  onDelete: (document: DocItem) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const p = props;
  return (
    <section className="dms-col-main">
      <p className="dms-kicker">Documents</p>
      <div className="dms-title-row">
        <div className="dms-title-block">
          <h1>Document list</h1>
          <div className="dms-subtitle">จัดการเอกสารทั้งหมดจากหน้านี้</div>
        </div>
        <div className="dms-title-search-row">
          <div className="dms-search-wrap">
            <FaMagnifyingGlass className="dms-search-icon" />
            <input
              type="text"
              value={p.search}
              onChange={(event) => p.onSearch(event.target.value)}
              placeholder="Search documents"
            />
          </div>
          <div className="dms-stats-group">
            <div className="dms-stats-pill">
              <FaFileLines />
              {p.total} Files
            </div>
            <div className="dms-stats-pill">
              <FaFolderOpen />
              {formatBytes(
                p.documents.reduce(
                  (sum, document) => sum + document.sizeBytes,
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
              สร้างโครงการใหม่
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
                  <span>กำลังโหลดประเภทเอกสาร…</span>
                </div>
              ) : p.typesError ? (
                <div className="dms-create-dropdown-state is-error">
                  <span className="dms-create-dropdown-error-title">
                    ไม่สามารถโหลดรายการได้
                  </span>
                  <span className="dms-create-dropdown-error-desc">
                    {p.typesError}
                  </span>
                </div>
              ) : !p.documentTypes.length ? (
                <div className="dms-create-dropdown-state">
                  <span>ยังไม่มีประเภทเอกสารเปิดใช้งาน</span>
                </div>
              ) : (
                p.documentTypes.map((type) => (
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
            title={p.sortOrder === "desc" ? "ใหม่ไปเก่า" : "เก่าไปใหม่"}
          >
            <FaArrowDownWideShort />
            Last Modified
          </button>
          <DocumentFilter
            filters={p.filters}
            documentTypes={p.documentTypes}
            onApply={p.onFiltersChange}
          />
          <div className="dms-view-toggle">
            <button
              type="button"
              className={`dms-view-toggle-btn ${p.viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => p.onViewModeChange("grid")}
              title="Grid view"
            >
              <FaTableCellsLarge />
            </button>
            <button
              type="button"
              className={`dms-view-toggle-btn ${p.viewMode === "list" ? "is-active" : ""}`}
              onClick={() => p.onViewModeChange("list")}
              title="List view"
            >
              <FaList />
            </button>
          </div>
        </div>
      </div>
      {p.loading ? (
        <div className="dms-document-list-state">กำลังโหลดเอกสาร...</div>
      ) : p.error ? (
        <div className="dms-document-list-state is-error">{p.error}</div>
      ) : (
        <DocumentList
          documents={p.documents}
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
        <div className="dms-document-empty">
          <FaFolderOpen />
          <div>ไม่พบเอกสารที่ตรงกับคำค้นหาหรือตัวกรอง</div>
        </div>
      )}
    </section>
  );
}
