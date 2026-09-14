import * as RadixDialog from "@radix-ui/react-dialog";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { PmProjectForm } from "../forms/pm/pm-project-form";
import type { ApiProjectType, ProjectItem, ProjectTypeId } from "../page";

export function ProjectFormModal({
  open,
  projectType,
  selectedTypeId,
  editingProject,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  projectType: ApiProjectType | null;
  selectedTypeId: ProjectTypeId | null;
  editingProject: ProjectItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="modal-backdrop" />
        <RadixDialog.Content
          className="dms-modal dms-create-doc-modal"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <RadixDialog.Title className="dms-modal-title">
            {editingProject ? "แก้ไข" : "สร้าง"}:{" "}
            {projectType?.name ?? "โครงการ"}
          </RadixDialog.Title>
          <RadixDialog.Description className="dms-modal-subtitle">
            {projectType
              ? editingProject
                ? "แก้ไขข้อมูลโครงการ PM"
                : "กรอกข้อมูลสำหรับสร้างโครงการ PM"
              : "กำลังเตรียมข้อมูลประเภทโครงการ"}
          </RadixDialog.Description>
          <RadixDialog.Close asChild>
            <button
              type="button"
              className="modal-close"
              aria-label="ปิดหน้าต่าง"
            >
              <FaXmark />
            </button>
          </RadixDialog.Close>
          <div className="dms-create-doc-body">
            {projectType ? (
              <PmProjectForm
                mode={editingProject ? "edit" : "create"}
                projectId={editingProject?.encryptedId}
                projectTypeId={projectType.id}
                initialValues={
                  editingProject
                    ? {
                        projectName: editingProject.name,
                        customerName:
                          editingProject.customerName === "—"
                            ? ""
                            : editingProject.customerName,
                        projectManager:
                          editingProject.projectManagerName === "—"
                            ? ""
                            : editingProject.projectManagerName,
                        siteAddress: editingProject.siteAddress,
                        latitude: editingProject.latitude,
                        longitude: editingProject.longitude,
                        projectDescription: editingProject.projectDescription,
                        plannedStartDate: editingProject.plannedStartDate,
                        plannedEndDate: editingProject.plannedEndDate,
                      }
                    : undefined
                }
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <div className="dms-create-doc-placeholder is-form">
                <FaPlus className="dms-create-placeholder-icon" />
                <div className="dms-create-doc-type-summary">
                  ประเภท: <strong>ยังไม่พบข้อมูลประเภทโครงการ</strong>
                  <span className="dms-pill-id">#ID {selectedTypeId}</span>
                </div>
                <p className="dms-create-doc-hint">
                  ตอนนี้เปิดทำเฉพาะฟอร์มของโครงการ PM ก่อน
                </p>
                <RadixDialog.Close asChild>
                  <button type="button" className="dms-back-btn">
                    ปิดหน้าต่าง
                  </button>
                </RadixDialog.Close>
              </div>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
