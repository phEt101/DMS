import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { FaPlus, FaXmark } from "react-icons/fa6";
import {
  createPmEquipment,
  deletePmEquipmentImage,
  pmEquipmentImageUrl,
  updatePmEquipment,
  uploadPmEquipmentImages,
  type PmEquipment,
} from "../services/projectsService";

export function PmEquipmentFormPreview({
  open,
  projectId,
  equipment = null,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  equipment?: PmEquipment | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (equipment: PmEquipment) => void;
}) {
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [faultSymptom, setFaultSymptom] = useState("");
  const [remarks, setRemarks] = useState("");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [persistedEquipment, setPersistedEquipment] =
    useState<PmEquipment | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pendingDeletedImageIds, setPendingDeletedImageIds] = useState<number[]>([]);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEquipmentName(equipment?.equipmentName ?? "");
    setEquipmentModel(equipment?.equipmentModel ?? "");
    setFaultSymptom(equipment?.faultSymptom ?? "");
    setRemarks(equipment?.remarks ?? "");
    setReferenceImages([]);
    setPersistedEquipment(equipment);
    setPreviewImage(null);
    setSaveError("");
    setPendingDeletedImageIds([]);
  }, [equipment, open]);

  const saveEquipment = async () => {
    if (!equipmentName.trim() || saving) return;
    try {
      setSaving(true);
      setSaveError("");
      const input = {
        equipmentName: equipmentName.trim(),
        equipmentModel: equipmentModel.trim(),
        faultSymptom: faultSymptom.trim(),
        remarks: remarks.trim(),
      };
      const response = persistedEquipment
        ? await updatePmEquipment(projectId, persistedEquipment.id, input)
        : await createPmEquipment(projectId, input);
      let savedEquipment = response.data;
      for (const imageId of pendingDeletedImageIds) {
        const deleted = await deletePmEquipmentImage(projectId, response.data.id, imageId);
        savedEquipment = deleted.equipment;
      }
      const uploaded = referenceImages.length
        ? await uploadPmEquipmentImages(
            projectId,
            response.data.id,
            [],
            [],
            referenceImages,
          )
        : null;
      if (uploaded) savedEquipment = uploaded.equipment;
      setPersistedEquipment(savedEquipment);
      onSaved(savedEquipment);
      onOpenChange(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "บันทึกอุปกรณ์ไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  };

  const existingReferenceIds = (persistedEquipment?.referenceImageIds ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((id) => !pendingDeletedImageIds.includes(id));
  const addReferenceImages = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    const validImages = selected.filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024,
    );
    const available = Math.max(
      0,
      4 - existingReferenceIds.length - referenceImages.length,
    );
    if (!available) {
      setSaveError("แนบภาพอุปกรณ์ได้สูงสุด 4 รูป");
      return;
    }
    if (validImages.length !== selected.length) {
      setSaveError("รองรับเฉพาะไฟล์รูปภาพขนาดไม่เกิน 10 MB ต่อรูป");
    } else if (validImages.length > available) {
      setSaveError(`เพิ่มได้อีกไม่เกิน ${available} รูป`);
    } else {
      setSaveError("");
    }
    setReferenceImages((current) => [
      ...current,
      ...validImages.slice(0, available),
    ]);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className="dms-modal dms-equipment-modal"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="dms-modal-title">
            {equipment ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
          </Dialog.Title>
          <Dialog.Description className="dms-modal-subtitle">
            {equipment
              ? "แก้ไขข้อมูลพื้นฐานของอุปกรณ์"
              : "ข้อมูลอุปกรณ์ภายในโครงการ PM"}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" className="modal-close" aria-label="ปิด">
              <FaXmark />
            </button>
          </Dialog.Close>
          <div className="dms-equipment-form-body">
            <div className="dms-equipment-form-grid">
              <label className="dms-equipment-field">
                <span>
                  ชื่ออุปกรณ์ <b>*</b>
                </span>
                <input
                  value={equipmentName}
                  onChange={(event) => setEquipmentName(event.target.value)}
                  placeholder="ระบุชื่ออุปกรณ์"
                />
              </label>
              <label className="dms-equipment-field">
                <span>รุ่น / Model</span>
                <input
                  value={equipmentModel}
                  onChange={(event) => setEquipmentModel(event.target.value)}
                  placeholder="ระบุรุ่นอุปกรณ์"
                />
              </label>
              <label className="dms-equipment-field is-full">
                <span>อาการขัดข้อง</span>
                <textarea
                  value={faultSymptom}
                  onChange={(event) => setFaultSymptom(event.target.value)}
                  rows={3}
                  placeholder="ระบุอาการขัดข้องหรืออาการที่ผู้แจ้งพบ"
                />
              </label>
              <label className="dms-equipment-field is-full">
                <span>หมายเหตุ</span>
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  placeholder="ระบุตำแหน่งติดตั้งหรือรายละเอียดเพิ่มเติมเกี่ยวกับอุปกรณ์"
                />
              </label>
              <section className="dms-equipment-reference-images is-full">
                <div>
                  <strong>ภาพอุปกรณ์และจุดติดตั้ง</strong>
                  <small>
                    ใช้ระบุตัวอุปกรณ์และตำแหน่งติดตั้ง แนบได้สูงสุด 4 รูป
                    รูปละไม่เกิน 10 MB
                  </small>
                </div>
                <div className="dms-equipment-reference-list">
                  {existingReferenceIds.map((id) => {
                    const source = pmEquipmentImageUrl(
                      projectId,
                      persistedEquipment!.id,
                      id,
                    );
                    return <div key={id}>
                      <img
                        src={source}
                        alt="ภาพอุปกรณ์และจุดติดตั้ง"
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewImage(source)}
                      />
                      <button type="button" disabled={saving} aria-label="นำรูปภาพออก" onClick={() => setPendingDeletedImageIds((current) => [...current, id])}><FaXmark /></button>
                    </div>;
                  })}
                  {referenceImages.map((file, index) => {
                    const source = URL.createObjectURL(file);
                    return (
                      <div key={`${file.name}-${index}`}>
                        <img
                          src={source}
                          alt={file.name}
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewImage(source)}
                        />
                        <button
                          type="button"
                          aria-label={`ลบรูป ${file.name}`}
                          onClick={() =>
                            setReferenceImages((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          <FaXmark />
                        </button>
                      </div>
                    );
                  })}
                  {existingReferenceIds.length + referenceImages.length < 4 && (
                    <button
                      type="button"
                      className="dms-equipment-image-add"
                      disabled={saving}
                      onClick={() => referenceInputRef.current?.click()}
                    >
                      <FaPlus />
                      <span>เพิ่มรูป</span>
                    </button>
                  )}
                  <input
                    ref={referenceInputRef}
                    className="dms-equipment-reference-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onClick={(event) => {
                      event.currentTarget.value = "";
                    }}
                    onChange={(event) => {
                      addReferenceImages(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
              </section>
            </div>
          </div>
          {saveError && (
            <p className="dms-equipment-save-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="dms-equipment-form-footer">
            <button
              type="button"
              className="dms-back-btn"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="dms-create-btn"
              disabled={!equipmentName.trim() || saving}
              onClick={() => void saveEquipment()}
            >
              {saving
                ? "กำลังบันทึก..."
                : equipment
                  ? "บันทึกการแก้ไข"
                  : "บันทึกอุปกรณ์"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      {previewImage &&
        createPortal(
          <div
            className="dms-image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="ตัวอย่างรูปภาพขนาดใหญ่"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              aria-label="ปิดรูปภาพ"
              onClick={() => setPreviewImage(null)}
            >
              <FaXmark />
            </button>
            <img
              src={previewImage}
              alt="ตัวอย่างรูปภาพขนาดใหญ่"
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </Dialog.Root>
  );
}
