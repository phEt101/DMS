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
import type { CommonTranslations, ProjectTranslations } from "../page";

type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
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
  projectTranslations,
  commonTranslations,
  project,
  projectTypeName,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
  project: ProjectDetail;
  projectTypeName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: "planning", label: projectTranslations.status.planning },
    { value: "active", label: projectTranslations.status.active },
    { value: "on_hold", label: projectTranslations.status.onHold },
    { value: "completed", label: projectTranslations.status.completed },
  ];
  const workOrderStatusLabels: Record<string, string> = {
    scheduled: projectTranslations.status.scheduled,
    in_progress: projectTranslations.status.active,
    waiting_parts: projectTranslations.status.waitingParts,
    completed: projectTranslations.status.completed,
    cancelled: projectTranslations.status.cancelled,
    on_hold: projectTranslations.status.onHold,
  };
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
  const equipmentStatusCounts = equipment.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.workOrderStatus] = (counts[item.workOrderStatus] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const equipmentOverview = [
    { status: "all", label: projectTranslations.detail.totalEquipment, count: equipment.length },
    { status: "scheduled", label: projectTranslations.status.scheduled, count: equipmentStatusCounts.scheduled ?? 0 },
    { status: "in_progress", label: projectTranslations.status.active, count: equipmentStatusCounts.in_progress ?? 0 },
    { status: "completed", label: projectTranslations.status.completed, count: equipmentStatusCounts.completed ?? 0 },
    { status: "waiting_parts", label: projectTranslations.status.waitingParts, count: equipmentStatusCounts.waiting_parts ?? 0 },
    { status: "on_hold", label: projectTranslations.status.onHold, count: equipmentStatusCounts.on_hold ?? 0 },
  ];

  useEffect(() => {
    let active = true;
    setEquipmentLoading(true);
    setEquipmentError("");
    listPmEquipment(project.encryptedId)
      .then((response) => { if (active) setEquipment(response.data); })
      .catch((error) => { if (active) setEquipmentError(error instanceof Error ? error.message : projectTranslations.detail.loadEquipmentError); })
      .finally(() => { if (active) setEquipmentLoading(false); });
    return () => { active = false; };
  }, [projectTranslations.detail.loadEquipmentError, project.encryptedId]);

  return (
    <section className="dms-project-view">
      <nav className="dms-project-breadcrumb" aria-label={projectTranslations.detail.breadcrumb}>
        <button type="button" onClick={onBack}>
          {projectTranslations.detail.breadcrumb}
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
          <RadixMenu.Trigger asChild><button type="button" className="dms-project-page-menu" aria-label={projectTranslations.detail.manage}><FaEllipsis /></button></RadixMenu.Trigger>
          <RadixMenu.Portal><RadixMenu.Content className="dms-card-menu-content" sideOffset={6} align="end">
            <RadixMenu.Item className="dms-card-menu-item" onSelect={onEdit}><FaPen />{commonTranslations.actions.edit}</RadixMenu.Item>
            <RadixMenu.Sub>
              <RadixMenu.SubTrigger className="dms-card-menu-item"><FaArrowsRotate />{projectTranslations.detail.changeStatus}<span className="dms-menu-chevron">›</span></RadixMenu.SubTrigger>
              <RadixMenu.Portal><RadixMenu.SubContent className="dms-card-menu-content" sideOffset={6} alignOffset={-4}>
                {projectStatusOptions.map((option) => <RadixMenu.Item key={option.value} className="dms-card-menu-item" disabled={project.projectStatus === option.value} onSelect={() => onStatusChange(option.value)}>{project.projectStatus === option.value ? <FaCheck /> : <span className="dms-menu-icon-space" />}{option.label}</RadixMenu.Item>)}
              </RadixMenu.SubContent></RadixMenu.Portal>
            </RadixMenu.Sub>
            <RadixMenu.Item className="dms-card-menu-item is-danger" onSelect={onDelete}><FaTrashCan />{commonTranslations.actions.delete}</RadixMenu.Item>
          </RadixMenu.Content></RadixMenu.Portal>
        </RadixMenu.Root>
      </header>

      <div
        className="dms-project-tabs"
        role="tablist"
        aria-label={projectTranslations.detail.tabsLabel}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={activeTab === "overview" ? "is-active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          {projectTranslations.detail.overview}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "equipment"}
          className={activeTab === "equipment" ? "is-active" : ""}
          onClick={() => setActiveTab("equipment")}
        >
          {projectTranslations.detail.equipment}
          {!equipmentLoading && <span className="dms-project-tab-count">{equipment.length}</span>}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="dms-project-overview-grid">
          <div className="dms-project-view-card is-wide">
            <h2>{projectTranslations.detail.projectInformation}</h2>
            <dl className="dms-project-summary">
              <div>
                <dt>{projectTranslations.detail.projectManager}</dt>
                <dd>{project.projectManagerName}</dd>
              </div>
              <div>
                <dt>{projectTranslations.detail.customer}</dt>
                <dd>{project.customerName}</dd>
              </div>
              <div>
                <dt>{commonTranslations.labels.lastModified}</dt>
                <dd>{project.updatedAt}</dd>
              </div>
              <div>
                <dt>{projectTranslations.detail.modifiedBy}</dt>
                <dd>{project.lastModifiedBy}</dd>
              </div>
              <div>
                <dt>{projectTranslations.detail.projectType}</dt>
                <dd>{projectTypeName}</dd>
              </div>
              <div>
                <dt>{commonTranslations.labels.status}</dt>
                <dd>{project.statusLabel}</dd>
              </div>
              <div>
                <dt>{projectTranslations.detail.createdAt}</dt>
                <dd>{project.createdAt}</dd>
              </div>
              <div>
                <dt>{projectTranslations.detail.createdBy}</dt>
                <dd>{project.uploadedBy}</dd>
              </div>
            </dl>
          </div>
          <div className="dms-project-view-card">
            <h2>
              <FaLocationDot /> {projectTranslations.detail.location}
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
            <h2>{projectTranslations.detail.description}</h2>
            <p>{project.projectDescription || projectTranslations.detail.noDescription}</p>
          </div>
          <div className="dms-project-view-card is-full dms-equipment-overview-card">
            <h2>{projectTranslations.detail.equipmentOverview}</h2>
            {equipmentLoading ? (
              <p className="dms-equipment-overview-state">{projectTranslations.detail.loadingEquipment}</p>
            ) : equipmentError ? (
              <p className="dms-equipment-overview-state is-error">{equipmentError}</p>
            ) : (
              <div className="dms-equipment-overview-grid">
                {equipmentOverview.map((item) => (
                  <div key={item.status} className={`dms-equipment-overview-item is-${item.status}`}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="dms-project-equipment-section">
          <div className="dms-project-equipment-head">
            <h2>{projectTranslations.detail.equipment}</h2>
            <button type="button" className="dms-create-btn dms-add-equipment-btn" onClick={() => { setEditingEquipment(null); setEquipmentFormOpen(true); }}>
              <FaPlus /> {projectTranslations.detail.addEquipment}
            </button>
          </div>
          {equipmentLoading ? <div className="dms-project-view-card dms-project-equipment-empty"><p>{projectTranslations.detail.loadingEquipment}</p></div>
            : equipmentError ? <div className="dms-project-view-card dms-project-equipment-empty is-error"><p>{equipmentError}</p></div>
            : equipment.length === 0 ? <div className="dms-project-view-card dms-project-equipment-empty"><p>{projectTranslations.detail.noEquipment}</p></div>
            : <div className="dms-project-equipment-list">{equipment.map((item) => {
              const operatorNames = [item.operator1Name, item.operator2Name, item.operator3Name].filter(Boolean);
              const referenceImageIds = (item.referenceImageIds ?? "").split(",").filter(Boolean).map(Number);
              return <article key={item.id} className="dms-project-equipment-card">
                <header className="dms-equipment-card-header"><div><h3>{item.equipmentName}</h3><p>{item.equipmentModel || "—"}</p></div><span className={`dms-equipment-status is-${item.workOrderStatus}`}>{workOrderStatusLabels[item.workOrderStatus] ?? item.workOrderStatus}</span></header>
                <div className={`dms-equipment-card-images ${referenceImageIds.length === 0 ? "is-empty" : referenceImageIds.length === 1 ? "is-single" : `is-multiple has-${referenceImageIds.length}`}`}>{referenceImageIds.length === 0 ? <span><FaImage /> {projectTranslations.detail.noEquipmentImage}</span> : referenceImageIds.map((imageId, imageIndex) => { const imageCopy = { name: item.equipmentName, index: String(imageIndex + 1) }; return <button type="button" className={imageIndex === 0 ? "is-main" : ""} key={imageId} aria-label={projectTranslations.detail.viewImage.replace("{name}", imageCopy.name).replace("{index}", imageCopy.index)} onClick={(event) => setPreviewImage(event.currentTarget.querySelector("img")?.currentSrc ?? null)}><img src={pmEquipmentImageUrl(project.encryptedId, item.id, imageId)} alt={projectTranslations.detail.equipmentImageAlt.replace("{name}", imageCopy.name).replace("{index}", imageCopy.index)} /></button>; })}</div>
                <div className="dms-equipment-card-detail"><small>{projectTranslations.detail.faultSymptom}</small><strong>{item.faultSymptom || "—"}</strong></div>
                <div className="dms-equipment-card-detail"><small>{projectTranslations.detail.remarks}</small><strong>{item.remarks || "—"}</strong></div>
                <div className="dms-equipment-card-detail"><small>{projectTranslations.detail.operators}</small><strong className="dms-equipment-operator-list">{operatorNames.length ? operatorNames.map((name) => <span key={name}>{name}</span>) : <span>{commonTranslations.states.unassigned}</span>}</strong></div>
                <footer className="dms-equipment-card-actions"><button type="button" className="is-view" onClick={() => { setEquipmentDetailMode("view"); setSelectedEquipment(item); }}><FaEye /> {projectTranslations.detail.view}</button><button type="button" className="is-basic-edit" onClick={() => { setEditingEquipment(item); setEquipmentFormOpen(true); }}><FaPen /> {projectTranslations.detail.editEquipment}</button><button type="button" className="is-work-detail" onClick={() => { setEquipmentDetailMode("edit"); setSelectedEquipment(item); }}><FaPen /> {item.workOrderStatus === "completed" ? projectTranslations.detail.editWork : projectTranslations.detail.recordWork}</button></footer>
              </article>;
            })}</div>}
        </div>
      )}
      <PmEquipmentFormPreview projectTranslations={projectTranslations.equipmentForm} commonTranslations={commonTranslations} open={equipmentFormOpen} projectId={project.encryptedId} equipment={editingEquipment} onOpenChange={(open) => { setEquipmentFormOpen(open); if (!open) setEditingEquipment(null); }} onSaved={(saved) => setEquipment((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])} />
      <PmEquipmentDetailForm projectTranslations={projectTranslations.workDetailForm} commonTranslations={commonTranslations} readOnly={equipmentDetailMode === "view"} open={selectedEquipment !== null} projectId={project.encryptedId} equipment={selectedEquipment} onOpenChange={(open) => { if (!open) setSelectedEquipment(null); }} onSaved={(saved) => setEquipment((current) => current.map((item) => item.id === saved.id ? saved : item))} />
      {previewImage && createPortal(<div className="dms-image-lightbox" role="dialog" aria-modal="true" aria-label={projectTranslations.detail.imagePreview} onClick={() => setPreviewImage(null)}><button type="button" aria-label={projectTranslations.detail.imagePreview} onClick={() => setPreviewImage(null)}><FaXmark /></button><img src={previewImage} alt={projectTranslations.detail.imagePreview} onClick={(event) => event.stopPropagation()} /></div>, globalThis.document.body)}
    </section>
  );
}

export function ProjectDetailState({
  error,
  projectTranslations,
  onBack,
}: {
  error?: string;
  projectTranslations: ProjectTranslations;
  onBack: () => void;
}) {
  return (
    <section className={`dms-project-view-state ${error ? "is-error" : ""}`}>
      {error ? <p>{error}</p> : <p>{projectTranslations.loadingProjects}</p>}
      {error && (
        <button type="button" onClick={onBack}>
          <FaArrowLeft /> {projectTranslations.detail.backToProjects}
        </button>
      )}
    </section>
  );
}
