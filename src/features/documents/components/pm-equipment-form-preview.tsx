import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FaXmark } from "react-icons/fa6";
import { createPmEquipment, type PmEquipment } from "../services/documentsService";

export function PmEquipmentFormPreview({ open, documentId, onOpenChange, onSaved }: { open: boolean; documentId: number; onOpenChange: (open: boolean) => void; onSaved: (equipment: PmEquipment) => void }) {
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEquipmentName("");
    setEquipmentModel("");
    setRemarks("");
    setSaveError("");
  }, [open]);

  const saveEquipment = async () => {
    if (!equipmentName.trim() || saving) return;
    try {
      setSaving(true);
      setSaveError("");
      const response = await createPmEquipment(documentId, {
        equipmentName: equipmentName.trim(),
        equipmentModel: equipmentModel.trim(),
        remarks: remarks.trim(),
      });
      onSaved(response.data);
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "บันทึกอุปกรณ์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="modal-backdrop" />
    <Dialog.Content className="dms-modal dms-equipment-modal" onInteractOutside={(event) => event.preventDefault()}>
      <Dialog.Title className="dms-modal-title">เพิ่มอุปกรณ์</Dialog.Title>
      <Dialog.Description className="dms-modal-subtitle">ข้อมูลอุปกรณ์ภายในโครงการ PM</Dialog.Description>
      <Dialog.Close asChild><button type="button" className="modal-close" aria-label="ปิด"><FaXmark /></button></Dialog.Close>
      <div className="dms-equipment-form-body"><div className="dms-equipment-form-grid">
        <label className="dms-equipment-field"><span>ชื่ออุปกรณ์ <b>*</b></span><input value={equipmentName} onChange={(event) => setEquipmentName(event.target.value)} placeholder="ระบุชื่ออุปกรณ์" /></label>
        <label className="dms-equipment-field"><span>รุ่น / Model</span><input value={equipmentModel} onChange={(event) => setEquipmentModel(event.target.value)} placeholder="ระบุรุ่นอุปกรณ์" /></label>
        <label className="dms-equipment-field is-full"><span>หมายเหตุ</span><textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} placeholder="ระบุตำแหน่งติดตั้งหรือรายละเอียดเพิ่มเติมเกี่ยวกับอุปกรณ์" /></label>
      </div></div>
      {saveError && <p className="dms-equipment-save-error" role="alert">{saveError}</p>}
      <div className="dms-equipment-form-footer"><button type="button" className="dms-back-btn" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</button><button type="button" className="dms-create-btn" disabled={!equipmentName.trim() || saving} onClick={() => void saveEquipment()}>{saving ? "กำลังบันทึก..." : "บันทึกอุปกรณ์"}</button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
