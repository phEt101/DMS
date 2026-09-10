import { useEffect, useState } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaArrowLeft, FaArrowsRotate, FaCalendarDays, FaCheck, FaEllipsis, FaLocationDot, FaPen, FaPlus, FaTrashCan } from "react-icons/fa6";
import { PmEquipmentFormPreview } from "./pm-equipment-form-preview";
import { PmEquipmentDetailForm } from "./pm-equipment-detail-form";
import { listPmEquipment, type PmEquipment } from "../services/documentsService";

type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "วางแผน" },
  { value: "active", label: "กำลังดำเนินการ" },
  { value: "on_hold", label: "ระงับ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  scheduled: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  waiting_parts: "รออะไหล่",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  on_hold: "ระงับ",
};

const projectMarkerIcon = L.divIcon({
  className: "dms-pm-map-marker",
  html: '<span class="dms-pm-map-marker-pin"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface DocumentDetail {
  id: number;
  name: string;
  projectDescription: string;
  projectStatus: string | null;
  siteAddress: string;
  latitude: string;
  longitude: string;
  plannedStartDate: string;
  plannedEndDate: string;
  status: string;
  statusLabel: string;
  size: string;
  projectManagerName: string;
  customerName: string;
  uploadedBy: string;
  updatedAt: string;
  createdAt: string;
  lastModifiedBy: string;
}

export function DocumentDetailView({
  document,
  documentTypeName,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  document: DocumentDetail;
  documentTypeName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "equipment">(
    "overview",
  );
  const [equipmentFormOpen, setEquipmentFormOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<PmEquipment | null>(null);
  const [equipment, setEquipment] = useState<PmEquipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentError, setEquipmentError] = useState("");
  const latitude = Number.parseFloat(document.latitude);
  const longitude = Number.parseFloat(document.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  useEffect(() => {
    let active = true;
    setEquipmentLoading(true);
    setEquipmentError("");
    listPmEquipment(document.id)
      .then((response) => { if (active) setEquipment(response.data); })
      .catch((error) => { if (active) setEquipmentError(error instanceof Error ? error.message : "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ"); })
      .finally(() => { if (active) setEquipmentLoading(false); });
    return () => { active = false; };
  }, [document.id]);

  return (
    <section className="dms-document-view">
      <nav className="dms-document-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Documents
        </button>
        <span>/</span>
        <span>{document.name}</span>
      </nav>

      <header className="dms-document-view-header">
        <div>
          <div className="dms-document-view-title-row">
            <h1>{document.name}</h1>
            <span className={`dms-card-status is-${document.status}`}>
              {document.statusLabel}
            </span>
          </div>
          <div className="dms-document-view-tags">
            <span>{documentTypeName}</span>
            <span>
              <FaCalendarDays /> {document.plannedStartDate || "—"} –{" "}
              {document.plannedEndDate || "—"}
            </span>
          </div>
        </div>
        <RadixMenu.Root>
          <RadixMenu.Trigger asChild><button type="button" className="dms-document-page-menu" aria-label="จัดการเอกสาร"><FaEllipsis /></button></RadixMenu.Trigger>
          <RadixMenu.Portal><RadixMenu.Content className="dms-card-menu-content" sideOffset={6} align="end">
            <RadixMenu.Item className="dms-card-menu-item" onSelect={onEdit}><FaPen />แก้ไข</RadixMenu.Item>
            <RadixMenu.Sub>
              <RadixMenu.SubTrigger className="dms-card-menu-item"><FaArrowsRotate />เปลี่ยนสถานะ<span className="dms-menu-chevron">›</span></RadixMenu.SubTrigger>
              <RadixMenu.Portal><RadixMenu.SubContent className="dms-card-menu-content" sideOffset={6} alignOffset={-4}>
                {PROJECT_STATUS_OPTIONS.map((option) => <RadixMenu.Item key={option.value} className="dms-card-menu-item" disabled={document.projectStatus === option.value} onSelect={() => onStatusChange(option.value)}>{document.projectStatus === option.value ? <FaCheck /> : <span className="dms-menu-icon-space" />}{option.label}</RadixMenu.Item>)}
              </RadixMenu.SubContent></RadixMenu.Portal>
            </RadixMenu.Sub>
            <RadixMenu.Item className="dms-card-menu-item is-danger" onSelect={onDelete}><FaTrashCan />ลบ</RadixMenu.Item>
          </RadixMenu.Content></RadixMenu.Portal>
        </RadixMenu.Root>
      </header>

      <div
        className="dms-document-tabs"
        role="tablist"
        aria-label="ข้อมูลเอกสาร"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={activeTab === "overview" ? "is-active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          ภาพรวม
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "equipment"}
          className={activeTab === "equipment" ? "is-active" : ""}
          onClick={() => setActiveTab("equipment")}
        >
          อุปกรณ์
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="dms-document-overview-grid">
          <div className="dms-document-view-card is-wide">
            <h2>ข้อมูลโครงการ</h2>
            <dl className="dms-document-summary">
              <div>
                <dt>ผู้จัดการโครงการ</dt>
                <dd>{document.projectManagerName}</dd>
              </div>
              <div>
                <dt>ลูกค้า</dt>
                <dd>{document.customerName}</dd>
              </div>
              <div>
                <dt>แก้ไขล่าสุด</dt>
                <dd>{document.updatedAt}</dd>
              </div>
              <div>
                <dt>แก้ไขโดย</dt>
                <dd>{document.lastModifiedBy}</dd>
              </div>
              <div>
                <dt>ประเภทเอกสาร</dt>
                <dd>{documentTypeName}</dd>
              </div>
              <div>
                <dt>สถานะ</dt>
                <dd>{document.statusLabel}</dd>
              </div>
              <div>
                <dt>สร้างเมื่อ</dt>
                <dd>{document.createdAt}</dd>
              </div>
              <div>
                <dt>สร้างโดย</dt>
                <dd>{document.uploadedBy}</dd>
              </div>
            </dl>
          </div>
          <div className="dms-document-view-card">
            <h2>
              <FaLocationDot /> สถานที่โครงการ
            </h2>
            {hasCoordinates && (
              <div className="dms-document-map">
                <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} attributionControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <Marker position={[latitude, longitude]} icon={projectMarkerIcon} />
                </MapContainer>
              </div>
            )}
            <p>{document.siteAddress || "—"}</p>
          </div>
          <div className="dms-document-view-card is-wide">
            <h2>รายละเอียดโครงการ</h2>
            <p>{document.projectDescription || "ยังไม่มีรายละเอียดโครงการ"}</p>
          </div>
        </div>
      ) : (
        <div className="dms-document-equipment-section">
          <div className="dms-document-equipment-head">
            <h2>อุปกรณ์</h2>
            <button type="button" className="dms-create-btn dms-add-equipment-btn" onClick={() => setEquipmentFormOpen(true)}>
              <FaPlus /> เพิ่มอุปกรณ์
            </button>
          </div>
          {equipmentLoading ? <div className="dms-document-view-card dms-document-equipment-empty"><p>กำลังโหลดข้อมูลอุปกรณ์...</p></div>
            : equipmentError ? <div className="dms-document-view-card dms-document-equipment-empty is-error"><p>{equipmentError}</p></div>
            : equipment.length === 0 ? <div className="dms-document-view-card dms-document-equipment-empty"><p>ยังไม่มีข้อมูลอุปกรณ์ในโครงการนี้</p></div>
            : <div className="dms-document-equipment-list">{equipment.map((item) => {
              const operatorNames = [item.operator1Name, item.operator2Name, item.operator3Name].filter(Boolean);
              return <article key={item.id} className="dms-document-equipment-card">
                <header className="dms-equipment-card-header"><div><h3>{item.equipmentName}</h3><p>{item.equipmentModel || "ไม่ระบุรุ่น"}</p></div><span className="dms-equipment-status">{WORK_ORDER_STATUS_LABELS[item.workOrderStatus] ?? item.workOrderStatus}</span></header>
                <div className="dms-equipment-card-detail"><small>ผู้ดำเนินการ</small><strong>{operatorNames.length ? operatorNames.join(" • ") : "ยังไม่กำหนด"}</strong></div>
                <div className="dms-equipment-card-detail"><small>หมายเหตุ</small><strong>{item.remarks || "—"}</strong></div>
                <footer className="dms-equipment-card-actions"><button type="button" onClick={() => setSelectedEquipment(item)}><FaPen /> กรอกรายละเอียด</button></footer>
              </article>;
            })}</div>}
        </div>
      )}
      <PmEquipmentFormPreview open={equipmentFormOpen} documentId={document.id} onOpenChange={setEquipmentFormOpen} onSaved={(created) => setEquipment((current) => [created, ...current])} />
      <PmEquipmentDetailForm open={selectedEquipment !== null} documentId={document.id} equipment={selectedEquipment} onOpenChange={(open) => { if (!open) setSelectedEquipment(null); }} onSaved={(ids, names, beforeIds, afterIds) => { if (!selectedEquipment) return; setEquipment((current) => current.map((item) => item.id === selectedEquipment.id ? { ...item, operator1Id: ids[0] ?? null, operator1Name: names[0] ?? null, operator2Id: ids[1] ?? null, operator2Name: names[1] ?? null, operator3Id: ids[2] ?? null, operator3Name: names[2] ?? null, beforeImageIds: beforeIds.join(",") || null, afterImageIds: afterIds.join(",") || null } : item)); }} />
    </section>
  );
}

export function DocumentDetailState({
  error,
  onBack,
}: {
  error?: string;
  onBack: () => void;
}) {
  return (
    <section className={`dms-document-view-state ${error ? "is-error" : ""}`}>
      {error ? <p>{error}</p> : <p>กำลังโหลดเอกสาร...</p>}
      {error && (
        <button type="button" onClick={onBack}>
          <FaArrowLeft /> กลับไปรายการเอกสาร
        </button>
      )}
    </section>
  );
}
