import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FaCheck, FaChevronDown, FaImage, FaPlus, FaXmark } from "react-icons/fa6";
import { listUsers, type User } from "../../settings/users/services/users.service";
import { listPmEquipmentItems, pmEquipmentImageUrl, savePmEquipmentItems, uploadPmEquipmentImages, type PmEquipment, type PmEquipmentItem, type PmEquipmentItemSection } from "../services/documentsService";

const sections: Array<{ value: PmEquipmentItemSection; label: string; placeholder: string }> = [
  { value: "cause", label: "ผลการตรวจสอบ", placeholder: "ระบุอาการหรือสาเหตุที่ตรวจพบ" },
  { value: "action", label: "วิธีการซ่อมและแก้ไข", placeholder: "ระบุวิธีดำเนินการแก้ไข" },
  { value: "result", label: "ผลการตรวจซ่อม", placeholder: "ระบุผลหลังดำเนินการ" },
];
const emptyDetails = (): Record<PmEquipmentItemSection, string[]> => ({ cause: [""], action: [""], result: [""] });

export function PmEquipmentDetailForm({ open, documentId, equipment, onOpenChange, onSaved }: { open: boolean; documentId: number; equipment: PmEquipment | null; onOpenChange: (open: boolean) => void; onSaved: (operatorIds: number[], operatorNames: string[], beforeImageIds: number[], afterImageIds: number[]) => void }) {
  const [details, setDetails] = useState(emptyDetails);
  const [activeSection, setActiveSection] = useState<PmEquipmentItemSection>("cause");
  const [loadedItems, setLoadedItems] = useState<PmEquipmentItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [operatorIds, setOperatorIds] = useState<number[]>([]);
  const [operatorSearch, setOperatorSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);

  useEffect(() => {
    if (!open || !equipment) return;
    let active = true;
    setLoading(true); setMessage(""); setDetails(emptyDetails()); setActiveSection("cause"); setOperatorSearch(""); setBeforeImages([]); setAfterImages([]);
    setOperatorIds([equipment.operator1Id, equipment.operator2Id, equipment.operator3Id].filter((id): id is number => id !== null));
    Promise.all([listPmEquipmentItems(documentId, equipment.id), listUsers({ status: "active", limit: 100 })])
      .then(([itemsResponse, usersResponse]) => {
        if (!active) return;
        setLoadedItems(itemsResponse.data);
        setUsers(usersResponse.data);
        setDetails(Object.fromEntries(sections.map(({ value }) => {
          const values = itemsResponse.data.filter((item) => item.section === value && item.itemContent).sort((a, b) => a.itemNo - b.itemNo).map((item) => item.itemContent ?? "");
          return [value, values.length ? values : [""]];
        })) as Record<PmEquipmentItemSection, string[]>);
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "โหลดรายละเอียดไม่สำเร็จ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId, equipment, open]);

  const filteredUsers = useMemo(() => {
    const search = operatorSearch.trim().toLocaleLowerCase("th");
    return search ? users.filter((user) => [user.name, user.email, user.department ?? ""].join(" ").toLocaleLowerCase("th").includes(search)) : users;
  }, [operatorSearch, users]);
  const toggleOperator = (id: number) => setOperatorIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 3 ? [...current, id] : current);
  const selectedUsers = operatorIds.map((id) => users.find((user) => user.id === id)).filter((user): user is User => Boolean(user));
  const existingBeforeIds = (equipment?.beforeImageIds ?? "").split(",").filter(Boolean).map(Number);
  const existingAfterIds = (equipment?.afterImageIds ?? "").split(",").filter(Boolean).map(Number);
  const addImages = (files: FileList | null, current: File[], existingCount: number, setter: (files: File[]) => void) => {
    if (!files) return;
    setter([...current, ...Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, 4 - existingCount - current.length))]);
  };
  const updateDetail = (index: number, content: string) => setDetails((current) => ({ ...current, [activeSection]: current[activeSection].map((value, itemIndex) => itemIndex === index ? content : value) }));
  const addDetail = () => setDetails((current) => ({ ...current, [activeSection]: [...current[activeSection], ""] }));
  const removeDetail = (index: number) => setDetails((current) => ({ ...current, [activeSection]: current[activeSection].filter((_, itemIndex) => itemIndex !== index) }));

  const save = async () => {
    if (!equipment || saving) return;
    const items = sections.flatMap(({ value }) => {
      const lines = details[value].map((line) => line.trim());
      const previousCount = loadedItems.filter((item) => item.section === value).reduce((highest, item) => Math.max(highest, item.itemNo), 0);
      return Array.from({ length: Math.max(lines.length, previousCount, 1) }, (_, index) => ({ section: value, itemNo: index + 1, itemContent: lines[index] ?? null }));
    });
    try {
      setSaving(true); setMessage("");
      await savePmEquipmentItems(documentId, equipment.id, items, operatorIds);
      const uploaded = beforeImages.length || afterImages.length ? await uploadPmEquipmentImages(documentId, equipment.id, beforeImages, afterImages) : null;
      onSaved(operatorIds, selectedUsers.map((user) => user.name), [...existingBeforeIds, ...(uploaded?.data.beforeIds ?? [])], [...existingAfterIds, ...(uploaded?.data.afterIds ?? [])]); onOpenChange(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "บันทึกรายละเอียดไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-backdrop" /><Dialog.Content className="dms-modal dms-equipment-detail-modal" onInteractOutside={(event) => event.preventDefault()}>
    <Dialog.Title className="dms-modal-title">กรอกรายละเอียด</Dialog.Title><Dialog.Description className="dms-modal-subtitle">{equipment?.equipmentName}{equipment?.equipmentModel ? ` • ${equipment.equipmentModel}` : ""}</Dialog.Description><Dialog.Close asChild><button type="button" className="modal-close" aria-label="ปิด"><FaXmark /></button></Dialog.Close>
    <div className="dms-equipment-detail-body">{loading ? <p className="dms-equipment-detail-state">กำลังโหลด...</p> : <div className="dms-equipment-simple-form">
      <div className="dms-equipment-simple-operators"><span>ผู้ดำเนินการ</span><DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="dms-equipment-simple-trigger"><span>{selectedUsers.length ? selectedUsers.map((user) => user.name).join(", ") : "เลือกผู้ดำเนินการ"}</span><FaChevronDown /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="dms-equipment-simple-menu" align="start" sideOffset={6}><input value={operatorSearch} onChange={(event) => setOperatorSearch(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="ค้นหาผู้ใช้งาน" />{filteredUsers.map((user) => { const selected = operatorIds.includes(user.id); return <DropdownMenu.CheckboxItem key={user.id} className="dms-equipment-simple-user" checked={selected} disabled={!selected && operatorIds.length >= 3} onCheckedChange={() => toggleOperator(user.id)} onSelect={(event) => event.preventDefault()}><i>{selected && <FaCheck />}</i><span><strong>{user.name}</strong><small>{user.department || user.email}</small></span></DropdownMenu.CheckboxItem>; })}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root><small>เลือกได้สูงสุด 3 คน</small></div>
      <div className="dms-equipment-detail-tabs" role="tablist">{sections.map((section) => <button key={section.value} type="button" role="tab" aria-selected={activeSection === section.value} className={activeSection === section.value ? "is-active" : ""} onClick={() => setActiveSection(section.value)}>{section.label}<span>{details[section.value].filter((value) => value.trim()).length || ""}</span></button>)}</div>
      <section className="dms-equipment-tab-panel"><div className="dms-equipment-tab-heading"><div><h3>{sections.find((section) => section.value === activeSection)?.label}</h3><p>เพิ่มเฉพาะจำนวนรายการที่ต้องใช้</p></div><button type="button" onClick={addDetail}>+ เพิ่มรายการ</button></div>{details[activeSection].map((content, index) => <div key={`${activeSection}-${index}`} className="dms-equipment-detail-row"><span>{sections.findIndex((section) => section.value === activeSection) + 1}.{index + 1}</span><textarea rows={3} value={content} onChange={(event) => updateDetail(index, event.target.value)} placeholder={sections.find((section) => section.value === activeSection)?.placeholder} />{details[activeSection].length > 1 && <button type="button" aria-label={`ลบรายการ ${index + 1}`} onClick={() => removeDetail(index)}><FaXmark /></button>}</div>)}</section>
      <section className="dms-equipment-images"><div className="dms-equipment-detail-heading"><h3>รูปภาพ</h3><small>ก่อนและหลัง อย่างละไม่เกิน 4 รูป</small></div><div className="dms-equipment-image-groups">{([{ key: "before", label: "ก่อนดำเนินงาน", existing: existingBeforeIds, files: beforeImages, setFiles: setBeforeImages }, { key: "after", label: "หลังดำเนินงาน", existing: existingAfterIds, files: afterImages, setFiles: setAfterImages }] as const).map((group) => <div key={group.key} className="dms-equipment-image-group"><strong>{group.label}</strong><div className="dms-equipment-image-list">{group.existing.map((id) => <img key={id} src={pmEquipmentImageUrl(documentId, equipment!.id, id)} alt={group.label} />)}{group.files.map((file, index) => <div key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name} /><button type="button" onClick={() => group.setFiles(group.files.filter((_, itemIndex) => itemIndex !== index))}><FaXmark /></button></div>)}{group.existing.length + group.files.length < 4 && <label className="dms-equipment-image-add"><FaPlus /><span>เพิ่มรูป</span><input type="file" accept="image/*" multiple onChange={(event) => { addImages(event.target.files, group.files, group.existing.length, group.setFiles); event.target.value = ""; }} /></label>}</div></div>)}</div></section>
    </div>}</div>{message && <p className="dms-equipment-save-error" role="alert">{message}</p>}<div className="dms-equipment-form-footer"><button type="button" className="dms-back-btn" disabled={saving} onClick={() => onOpenChange(false)}>ยกเลิก</button><button type="button" className="dms-create-btn" disabled={loading || saving} onClick={() => void save()}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
