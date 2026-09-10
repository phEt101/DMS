import * as RadixDialog from "@radix-ui/react-dialog";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { PmDocumentForm } from "../forms/pm/pm-document-form";
import type { ApiDocumentType, DocItem, DocumentTypeId } from "../page";

export function DocumentFormModal({
  open,
  documentType,
  selectedTypeId,
  editingDocument,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  documentType: ApiDocumentType | null;
  selectedTypeId: DocumentTypeId | null;
  editingDocument: DocItem | null;
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
            {editingDocument ? "แก้ไข" : "สร้าง"}:{" "}
            {documentType?.name ?? "เอกสาร"}
          </RadixDialog.Title>
          <RadixDialog.Description className="dms-modal-subtitle">
            {documentType
              ? editingDocument
                ? "แก้ไขข้อมูลโครงการ PM"
                : "กรอกข้อมูลสำหรับสร้างโครงการ PM"
              : "กำลังเตรียมข้อมูลประเภทเอกสาร"}
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
            {documentType ? (
              <PmDocumentForm
                mode={editingDocument ? "edit" : "create"}
                documentId={editingDocument?.id}
                documentTypeId={documentType.id}
                initialValues={
                  editingDocument
                    ? {
                        projectName: editingDocument.name,
                        customerName:
                          editingDocument.customerName === "—"
                            ? ""
                            : editingDocument.customerName,
                        projectManager:
                          editingDocument.projectManagerName === "—"
                            ? ""
                            : editingDocument.projectManagerName,
                        siteAddress: editingDocument.siteAddress,
                        latitude: editingDocument.latitude,
                        longitude: editingDocument.longitude,
                        projectDescription: editingDocument.projectDescription,
                        plannedStartDate: editingDocument.plannedStartDate,
                        plannedEndDate: editingDocument.plannedEndDate,
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
                  ประเภท: <strong>ยังไม่พบข้อมูลประเภทเอกสาร</strong>
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
