import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaArrowLeft, FaArrowsRotate, FaCalendarDays, FaCheck, FaEllipsis, FaEye, FaImage, FaLocationDot, FaPen, FaPlus, FaTrashCan, FaXmark } from "react-icons/fa6";
import { PmEquipmentFormPreview } from "./pm-equipment-form-preview";
import { PmEquipmentDetailForm } from "./pm-equipment-detail-form";
import { listPmEquipment, pmEquipmentImageUrl, type PmEquipment } from "../services/projectsService";

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

interface ProjectDetail {
  encryptedId: string;
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

export function ProjectDetailView({
  project,
  projectTypeName,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  project: ProjectDetail;
  projectTypeName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "equipment">(
    "overview",
  );
  const [equipmentFormOpen, setEquipmentFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<PmEquipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<PmEquipment | null>(null);
  const [equipmentDetailMode, setEquipmentDetailMode] = useState<"view" | "edit">("view");
  const [equipment, setEquipment] = useState<PmEquipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentError, setEquipmentError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const latitude = Number.parseFloat(project.latitude);
  const longitude = Number.parseFloat(project.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  useEffect(() => {
    let active = true;
    setEquipmentLoading(true);
    setEquipmentError("");
    listPmEquipment(project.encryptedId)
      .then((response) => { if (active) setEquipment(response.data); })
      .catch((error) => { if (active) setEquipmentError(error instanceof Error ? error.message : "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ"); })
      .finally(() => { if (active) setEquipmentLoading(false); });
    return () => { active = false; };
  }, [project.encryptedId]);

  return (
    <section className="dms-project-view">
      <nav className="dms-project-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Projects
        </button>
        <span>/</span>
        <span>{project.name}</span>
      </nav>

      <header className="dms-project-view-header">
        <div>
          <div className="dms-project-view-title-row">
            <h1>{project.name}</h1>
            <span className={`dms-card-status is-${project.status}`}>
              {project.statusLabel}
            </span>
          </div>
          <div className="dms-project-view-tags">
            <span>{projectTypeName}</span>
            <span>
              <FaCalendarDays /> {project.plannedStartDate || "—"} –{" "}
              {project.plannedEndDate || "—"}
            </span>
          </div>
        </div>
        <RadixMenu.Root>
          <RadixMenu.Trigger asChild><button type="button" className="dms-project-page-menu" aria-label="จัดการโครงการ"><FaEllipsis /></button></RadixMenu.Trigger>
          <RadixMenu.Portal><RadixMenu.Content className="dms-card-menu-content" sideOffset={6} align="end">
            <RadixMenu.Item className="dms-card-menu-item" onSelect={onEdit}><FaPen />แก้ไข</RadixMenu.Item>
            <RadixMenu.Sub>
              <RadixMenu.SubTrigger className="dms-card-menu-item"><FaArrowsRotate />เปลี่ยนสถานะ<span className="dms-menu-chevron">›</span></RadixMenu.SubTrigger>
              <RadixMenu.Portal><RadixMenu.SubContent className="dms-card-menu-content" sideOffset={6} alignOffset={-4}>
                {PROJECT_STATUS_OPTIONS.map((option) => <RadixMenu.Item key={option.value} className="dms-card-menu-item" disabled={project.projectStatus === option.value} onSelect={() => onStatusChange(option.value)}>{project.projectStatus === option.value ? <FaCheck /> : <span className="dms-menu-icon-space" />}{option.label}</RadixMenu.Item>)}
              </RadixMenu.SubContent></RadixMenu.Portal>
            </RadixMenu.Sub>
            <RadixMenu.Item className="dms-card-menu-item is-danger" onSelect={onDelete}><FaTrashCan />ลบ</RadixMenu.Item>
          </RadixMenu.Content></RadixMenu.Portal>
        </RadixMenu.Root>
      </header>

      <div
        className="dms-project-tabs"
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
          {!equipmentLoading && <span className="dms-project-tab-count">{equipment.length}</span>}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="dms-project-overview-grid">
          <div className="dms-project-view-card is-wide">
            <h2>ข้อมูลโครงการ</h2>
            <dl className="dms-project-summary">
              <div>
                <dt>ผู้จัดการโครงการ</dt>
                <dd>{project.projectManagerName}</dd>
              </div>
              <div>
                <dt>ลูกค้า</dt>
                <dd>{project.customerName}</dd>
              </div>
              <div>
                <dt>แก้ไขล่าสุด</dt>
                <dd>{project.updatedAt}</dd>
              </div>
              <div>
                <dt>แก้ไขโดย</dt>
                <dd>{project.lastModifiedBy}</dd>
              </div>
              <div>
                <dt>ประเภทเอกสาร</dt>
                <dd>{projectTypeName}</dd>
              </div>
              <div>
                <dt>สถานะ</dt>
                <dd>{project.statusLabel}</dd>
              </div>
              <div>
                <dt>สร้างเมื่อ</dt>
                <dd>{project.createdAt}</dd>
              </div>
              <div>
                <dt>สร้างโดย</dt>
                <dd>{project.uploadedBy}</dd>
              </div>
            </dl>
          </div>
          <div className="dms-project-view-card">
            <h2>
              <FaLocationDot /> สถานที่โครงการ
            </h2>
            {hasCoordinates && (
              <div className="dms-project-map">
                <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} attributionControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <Marker position={[latitude, longitude]} icon={projectMarkerIcon} />
                </MapContainer>
              </div>
            )}
            <p>{project.siteAddress || "—"}</p>
          </div>
          <div className="dms-project-view-card is-wide">
            <h2>รายละเอียดโครงการ</h2>
            <p>{project.projectDescription || "ยังไม่มีรายละเอียดโครงการ"}</p>
          </div>
        </div>
      ) : (
        <div className="dms-project-equipment-section">
          <div className="dms-project-equipment-head">
            <h2>อุปกรณ์</h2>
            <button type="button" className="dms-create-btn dms-add-equipment-btn" onClick={() => { setEditingEquipment(null); setEquipmentFormOpen(true); }}>
              <FaPlus /> เพิ่มอุปกรณ์
            </button>
          </div>
          {equipmentLoading ? <div className="dms-project-view-card dms-project-equipment-empty"><p>กำลังโหลดข้อมูลอุปกรณ์...</p></div>
            : equipmentError ? <div className="dms-project-view-card dms-project-equipment-empty is-error"><p>{equipmentError}</p></div>
            : equipment.length === 0 ? <div className="dms-project-view-card dms-project-equipment-empty"><p>ยังไม่มีข้อมูลอุปกรณ์ในโครงการนี้</p></div>
            : <div className="dms-project-equipment-list">{equipment.map((item) => {
              const operatorNames = [item.operator1Name, item.operator2Name, item.operator3Name].filter(Boolean);
              const referenceImageIds = (item.referenceImageIds ?? "").split(",").filter(Boolean).map(Number);
              return <article key={item.id} className="dms-project-equipment-card">
                <header className="dms-equipment-card-header"><div><h3>{item.equipmentName}</h3><p>{item.equipmentModel || "ไม่ระบุรุ่น"}</p></div><span className={`dms-equipment-status is-${item.workOrderStatus}`}>{WORK_ORDER_STATUS_LABELS[item.workOrderStatus] ?? item.workOrderStatus}</span></header>
                <div className={`dms-equipment-card-images ${referenceImageIds.length === 0 ? "is-empty" : referenceImageIds.length === 1 ? "is-single" : `is-multiple has-${referenceImageIds.length}`}`}>{referenceImageIds.length === 0 ? <span><FaImage /> ยังไม่มีภาพอุปกรณ์</span> : referenceImageIds.map((imageId, imageIndex) => <button type="button" className={imageIndex === 0 ? "is-main" : ""} key={imageId} aria-label={`ดูภาพ ${item.equipmentName} รูปที่ ${imageIndex + 1}`} onClick={(event) => setPreviewImage(event.currentTarget.querySelector("img")?.currentSrc ?? null)}><img src={pmEquipmentImageUrl(project.encryptedId, item.id, imageId)} alt={`ภาพ ${item.equipmentName} รูปที่ ${imageIndex + 1}`} /></button>)}</div>
                <div className="dms-equipment-card-detail"><small>อาการขัดข้อง</small><strong>{item.faultSymptom || "—"}</strong></div>
                <div className="dms-equipment-card-detail"><small>หมายเหตุ</small><strong>{item.remarks || "—"}</strong></div>
                <div className="dms-equipment-card-detail"><small>ผู้ดำเนินการ</small><strong className="dms-equipment-operator-list">{operatorNames.length ? operatorNames.map((name) => <span key={name}>{name}</span>) : <span>ยังไม่กำหนด</span>}</strong></div>
                <footer className="dms-equipment-card-actions"><button type="button" className="is-view" onClick={() => { setEquipmentDetailMode("view"); setSelectedEquipment(item); }}><FaEye /> ดูข้อมูล</button><button type="button" className="is-basic-edit" onClick={() => { setEditingEquipment(item); setEquipmentFormOpen(true); }}><FaPen /> แก้ไขข้อมูลอุปกรณ์</button><button type="button" className="is-work-detail" onClick={() => { setEquipmentDetailMode("edit"); setSelectedEquipment(item); }}><FaPen /> {item.workOrderStatus === "completed" ? "แก้ไขผลการทำงาน" : "บันทึกผลการทำงาน"}</button></footer>
              </article>;
            })}</div>}
        </div>
      )}
      <PmEquipmentFormPreview open={equipmentFormOpen} projectId={project.encryptedId} equipment={editingEquipment} onOpenChange={(open) => { setEquipmentFormOpen(open); if (!open) setEditingEquipment(null); }} onSaved={(saved) => setEquipment((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])} />
      <PmEquipmentDetailForm readOnly={equipmentDetailMode === "view"} open={selectedEquipment !== null} projectId={project.encryptedId} equipment={selectedEquipment} onOpenChange={(open) => { if (!open) setSelectedEquipment(null); }} onSaved={(saved) => setEquipment((current) => current.map((item) => item.id === saved.id ? saved : item))} />
      {previewImage && createPortal(<div className="dms-image-lightbox" role="dialog" aria-modal="true" aria-label="ตัวอย่างรูปอุปกรณ์ขนาดใหญ่" onClick={() => setPreviewImage(null)}><button type="button" aria-label="ปิดรูปภาพ" onClick={() => setPreviewImage(null)}><FaXmark /></button><img src={previewImage} alt="ตัวอย่างรูปอุปกรณ์ขนาดใหญ่" onClick={(event) => event.stopPropagation()} /></div>, globalThis.document.body)}
    </section>
  );
}

export function ProjectDetailState({
  error,
  onBack,
}: {
  error?: string;
  onBack: () => void;
}) {
  return (
    <section className={`dms-project-view-state ${error ? "is-error" : ""}`}>
      {error ? <p>{error}</p> : <p>กำลังโหลดโครงการ...</p>}
      {error && (
        <button type="button" onClick={onBack}>
          <FaArrowLeft /> กลับไปรายการโครงการ
        </button>
      )}
    </section>
  );
}
