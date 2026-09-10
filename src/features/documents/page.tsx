import { useEffect, useState } from "react";
import type { Translations } from "../../locales";
import { request } from "../../services/api";
import { useToast } from "../../components/toast-provider";
import { moveDocumentToTrash, updatePmProjectStatus } from "./services/documentsService";
import {
  DocumentDetailState,
  DocumentDetailView,
} from "./components/document-detail-view";
import {
  EMPTY_DOCUMENT_FILTERS,
  type DocumentFilters,
} from "./components/document-filter";
import { DocumentMainList } from "./components/document-main-list";
import { DocumentSidePanel } from "./components/document-side-panel";
import { DocumentFormModal } from "./components/document-form-modal";

export type DocStatus = "planning" | "active" | "on_hold" | "done" | "cancelled";
export type DocumentTypeId = number;
export interface ApiDocumentType {
  id: number;
  name: string;
  departmentId: number | null;
  isActive: boolean;
}
export interface ApiDocumentItem {
  id: number;
  documentTypeId: number;
  projectName: string | null;
  projectDescription: string | null;
  projectStatus: "planning" | "active" | "on_hold" | "completed" | "cancelled" | null;
  siteAddress: string | null;
  siteLat: number | null;
  siteLon: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  projectManagerName: string | null;
  customerName: string | null;
  status: "draft" | "approved" | "archived" | "trash";
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  uploadedBy: string | null;
  sizeBytes: number | string | null;
  lastModifiedBy: string | null;
  operatorNames: string | null;
}
export interface DocItem {
  id: number;
  documentTypeId: number;
  name: string;
  projectDescription: string;
  projectStatus: ApiDocumentItem["projectStatus"];
  siteAddress: string;
  latitude: string;
  longitude: string;
  plannedStartDate: string;
  plannedEndDate: string;
  status: DocStatus;
  statusLabel: string;
  size: string;
  sizeBytes: number;
  ownerName: string;
  ownerInitials: string;
  projectManagerName: string;
  customerName: string;
  operatorNames: string[];
  uploadedBy: string;
  updatedAt: string;
  createdAt: string;
  lastModifiedBy: string;
}

const STATUS_LABEL: Record<DocStatus, string> = {
  planning: "วางแผน",
  active: "เริ่มดำเนินงานตามแผนที่วาง",
  on_hold: "ระงับ",
  done: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};
export function formatBytes(value: number | string | null | undefined) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes,
    index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
export function getInitials(name: string | null | undefined) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}
function documentIdFromPath(path: string) {
  const match = path.match(/^\/documents\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function mapDocument(d: ApiDocumentItem): DocItem {
  const owner =
    d.projectManagerName?.trim() ||
    d.uploadedBy?.trim() ||
    d.customerName?.trim() ||
    "Unknown";
  const status: DocStatus = d.projectStatus === "completed" ? "done"
    : d.projectStatus === "cancelled" ? "cancelled"
    : d.projectStatus ?? (d.status === "approved"
      ? "active"
      : d.status === "archived"
        ? "done"
        : "planning");
  return {
    id: d.id,
    documentTypeId: d.documentTypeId,
    name:
      d.projectName?.trim() ||
      d.projectManagerName?.trim() ||
      d.customerName?.trim() ||
      `Document #${d.id}`,
    projectDescription: d.projectDescription ?? "",
    projectStatus: d.projectStatus,
    siteAddress: d.siteAddress ?? "",
    latitude: d.siteLat == null ? "" : String(d.siteLat),
    longitude: d.siteLon == null ? "" : String(d.siteLon),
    plannedStartDate: d.plannedStartDate?.slice(0, 10) ?? "",
    plannedEndDate: d.plannedEndDate?.slice(0, 10) ?? "",
    status,
    statusLabel: STATUS_LABEL[status],
    size: formatBytes(d.sizeBytes),
    sizeBytes: Number(d.sizeBytes ?? 0),
    ownerName: owner,
    ownerInitials: getInitials(owner),
    projectManagerName: d.projectManagerName?.trim() || "—",
    customerName: d.customerName?.trim() || "—",
    operatorNames: Array.from(
      new Set(
        (d.operatorNames ?? "")
          .split("•")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ),
    uploadedBy: d.uploadedBy?.trim() || "—",
    createdAt: formatDate(d.createdAt),
    updatedAt: formatDate(d.updatedAt ?? d.createdAt),
    lastModifiedBy: d.lastModifiedBy ?? "—",
  };
}

export default function DocumentsPage({
  translations,
}: {
  translations: Translations;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<DocumentFilters>(
    EMPTY_DOCUMENT_FILTERS,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [fullId, setFullId] = useState<number | null>(() =>
    documentIdFromPath(location.pathname),
  );
  const [fullDoc, setFullDoc] = useState<DocItem | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);
  const [types, setTypes] = useState<ApiDocumentType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setTypesLoading(true);
        const p = (await request("/document-types")) as {
          data: ApiDocumentType[];
        };
        if (!stop) setTypes(p.data ?? []);
      } catch (e) {
        if (!stop)
          setTypesError(
            e instanceof Error ? e.message : "โหลดประเภทเอกสารไม่สำเร็จ",
          );
      } finally {
        if (!stop) setTypesLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const q = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          sortOrder,
        });
        if (search.trim()) q.set("search", search.trim());
        if (filters.status) q.set("status", filters.status);
        if (filters.documentTypeId)
          q.set("documentTypeId", filters.documentTypeId);
        if (filters.dateFrom) q.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) q.set("dateTo", filters.dateTo);
        const p = (await request(`/documents?${q}`)) as {
          data?: ApiDocumentItem[];
          pagination?: { total?: number };
        };
        if (!stop) {
          setDocuments((p.data ?? []).map(mapDocument));
          setTotal(Number(p.pagination?.total ?? 0));
        }
      } catch (e) {
        if (!stop)
          setError(e instanceof Error ? e.message : "โหลดเอกสารไม่สำเร็จ");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [page, pageSize, search, filters, sortOrder, refresh]);
  useEffect(() => {
    const sync = () => setFullId(documentIdFromPath(location.pathname));
    addEventListener("popstate", sync);
    return () => removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (fullId === null) {
      setFullDoc(null);
      setFullError(null);
      return;
    }
    let stop = false;
    (async () => {
      try {
        setFullLoading(true);
        setFullDoc(null);
        const p = (await request(`/documents/${fullId}`)) as {
          data?: ApiDocumentItem;
        };
        if (!stop)
          p.data
            ? setFullDoc(mapDocument(p.data))
            : setFullError("ไม่พบเอกสาร");
      } catch (e) {
        if (!stop)
          setFullError(e instanceof Error ? e.message : "โหลดเอกสารไม่สำเร็จ");
      } finally {
        if (!stop) setFullLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [fullId, refresh]);
  const openFull = (id: number) => {
    setSelectedId(null);
    setFullId(id);
    history.pushState({}, "", `/documents/${id}`);
  };
  const closeFull = () => {
    setFullId(null);
    history.pushState({}, "", "/documents");
  };
  const closeModal = () => {
    setModalOpen(false);
    setTypeId(null);
    setEditing(null);
  };
  const remove = async (d: DocItem) => {
    if (!confirm(`ยืนยันการลบโครงการ “${d.name}” ?`)) return false;
    try {
      await moveDocumentToTrash(d.id);
      setSelectedId(null);
      setRefresh((v) => v + 1);
      showToast("ย้ายโครงการไปยังถังขยะแล้ว", "success");
      return true;
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "ไม่สามารถลบโครงการได้",
        "error",
      );
      return false;
    }
  };
  const updateProjectStatus = async (document: DocItem, status: NonNullable<ApiDocumentItem["projectStatus"]>) => {
    try {
      await updatePmProjectStatus(document.id, status);
      setRefresh((value) => value + 1);
      showToast("เปลี่ยนสถานะโครงการแล้ว", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสถานะโครงการได้", "error");
    }
  };
  if (fullId !== null) {
    if (fullLoading && !fullDoc)
      return <DocumentDetailState onBack={closeFull} />;
    if (fullError || !fullDoc)
      return (
        <DocumentDetailState
          error={fullError ?? "ไม่พบเอกสาร"}
          onBack={closeFull}
        />
      );
    const selectedType = types.find((type) => type.id === fullDoc.documentTypeId) ?? null;
    return <>
      <DocumentDetailView
        document={fullDoc}
        documentTypeName={
          types.find((t) => t.id === fullDoc.documentTypeId)?.name ??
          `ประเภท #${fullDoc.documentTypeId}`
        }
        onBack={closeFull}
        onEdit={() => { setEditing(fullDoc); setTypeId(fullDoc.documentTypeId); setModalOpen(true); }}
        onDelete={async () => { if (await remove(fullDoc)) closeFull(); }}
        onStatusChange={(status) => void updateProjectStatus(fullDoc, status)}
      />
      <DocumentFormModal open={modalOpen} documentType={selectedType} selectedTypeId={fullDoc.documentTypeId} editingDocument={editing} onOpenChange={(open) => open ? setModalOpen(true) : closeModal()} onSaved={() => setRefresh((value) => value + 1)} />
    </>;
  }
  const selected = documents.find((d) => d.id === selectedId) ?? null;
  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  return (
    <div className="dms-page-root">
      <DocumentMainList
        translations={translations}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        documents={documents}
        total={total}
        documentTypes={types}
        typesLoading={typesLoading}
        typesError={typesError}
        onCreate={(id) => {
          setEditing(null);
          setTypeId(id);
          setModalOpen(true);
        }}
        sortOrder={sortOrder}
        onToggleSort={() => {
          setSortOrder((v) => (v === "desc" ? "asc" : "desc"));
          setPage(1);
        }}
        filters={filters}
        onFiltersChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={setSelectedId}
        onOpen={openFull}
        onEdit={(d) => {
          setEditing(d);
          setTypeId(d.documentTypeId);
          setModalOpen(true);
        }}
        onDelete={(d) => void remove(d)}
        page={Math.min(page, pages)}
        pageSize={pageSize}
        onPageChange={(v) => setPage(Math.max(1, Math.min(v, pages)))}
        onPageSizeChange={(v) => {
          setPageSize(v);
          setPage(1);
        }}
      />
      {selected && (
        <DocumentSidePanel
          document={selected}
          onClose={() => setSelectedId(null)}
          onOpen={openFull}
        />
      )}
      <DocumentFormModal
        open={modalOpen}
        documentType={selectedType}
        selectedTypeId={typeId}
        editingDocument={editing}
        onOpenChange={(open) => (open ? setModalOpen(true) : closeModal())}
        onSaved={() => {
          setSearch("");
          setPage(1);
          setRefresh((v) => v + 1);
        }}
      />
    </div>
  );
}
