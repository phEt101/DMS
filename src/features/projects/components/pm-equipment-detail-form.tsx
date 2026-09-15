import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  FaCheck,
  FaChevronDown,
  FaImage,
  FaPlus,
  FaXmark,
} from "react-icons/fa6";
import {
  listUsers,
  type User,
} from "../../settings/users/services/users.service";
import {
  deletePmEquipmentImage,
  listPmEquipmentWorkDetails,
  pmEquipmentImageUrl,
  savePmEquipmentWorkDetails,
  uploadPmEquipmentImages,
  type PmEquipment,
  type PmEquipmentWorkDetail,
  type PmEquipmentWorkDetailSection,
} from "../services/projectsService";

const sections: Array<{
  value: PmEquipmentWorkDetailSection;
  label: string;
  placeholder: string;
}> = [
  {
    value: "cause",
    label: "ผลการตรวจสอบ",
    placeholder: "ระบุสาเหตุที่ตรวจพบจากการตรวจสอบ",
  },
  {
    value: "action",
    label: "วิธีการซ่อมและแก้ไข",
    placeholder: "ระบุวิธีดำเนินการแก้ไข",
  },
  {
    value: "result",
    label: "ผลการตรวจซ่อม",
    placeholder: "ระบุผลหลังดำเนินการ",
  },
];
const emptyDetails = (): Record<PmEquipmentWorkDetailSection, string[]> => ({
  cause: [""],
  action: [""],
  result: [""],
});
type StatusMode = "automatic" | "on_hold" | "waiting_parts";
const statusModeLabels: Record<StatusMode, string> = {
  automatic: "ตามความคืบหน้าอัตโนมัติ",
  on_hold: "ระงับ",
  waiting_parts: "รออะไหล่",
};

export function PmEquipmentDetailForm({
  open,
  readOnly = false,
  projectId,
  equipment,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  readOnly?: boolean;
  projectId: string;
  equipment: PmEquipment | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (equipment: PmEquipment) => void;
}) {
  const [details, setDetails] = useState(emptyDetails);
  const [activeSection, setActiveSection] =
    useState<PmEquipmentWorkDetailSection>("cause");
  const [loadedWorkDetails, setLoadedItems] = useState<PmEquipmentWorkDetail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [operatorIds, setOperatorIds] = useState<number[]>([]);
  const [operatorSearch, setOperatorSearch] = useState("");
  const [statusMode, setStatusMode] = useState<StatusMode>("automatic");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingDeletedImageIds, setPendingDeletedImageIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open || !equipment) return;
    let active = true;
    setLoading(true);
    setMessage("");
    setDetails(emptyDetails());
    setActiveSection("cause");
    setOperatorSearch("");
    setStatusMode(
      equipment.workOrderStatus === "on_hold" ||
          equipment.workOrderStatus === "waiting_parts"
        ? equipment.workOrderStatus
        : "automatic",
    );
    setBeforeImages([]);
    setAfterImages([]);
    setPreviewImage(null);
    setPendingDeletedImageIds([]);
    setOperatorIds(
      [
        equipment.operator1Id,
        equipment.operator2Id,
        equipment.operator3Id,
      ].filter((id): id is number => id !== null),
    );
    Promise.all([
      listPmEquipmentWorkDetails(projectId, equipment.id),
      listUsers({ status: "active", limit: 100 }),
    ])
      .then(([itemsResponse, usersResponse]) => {
        if (!active) return;
        setLoadedItems(itemsResponse.data);
        setUsers(usersResponse.data);
        setDetails(
          Object.fromEntries(
            sections.map(({ value }) => {
              const values = itemsResponse.data
                .filter((item) => item.section === value && item.itemContent)
                .sort((a, b) => a.itemNo - b.itemNo)
                .map((item) => item.itemContent ?? "");
              return [value, values.length ? values : [""]];
            }),
          ) as Record<PmEquipmentWorkDetailSection, string[]>,
        );
      })
      .catch((error) => {
        if (active)
          setMessage(
            error instanceof Error ? error.message : "โหลดรายละเอียดไม่สำเร็จ",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, equipment, open]);

  useEffect(() => {
    if (!previewImage) return;
    const closePreview = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    addEventListener("keydown", closePreview);
    return () => removeEventListener("keydown", closePreview);
  }, [previewImage]);

  const filteredUsers = useMemo(() => {
    const search = operatorSearch.trim().toLocaleLowerCase("th");
    return search
      ? users.filter((user) =>
          [user.name, user.email, user.department ?? ""]
            .join(" ")
            .toLocaleLowerCase("th")
            .includes(search),
        )
      : users;
  }, [operatorSearch, users]);
  const toggleOperator = (id: number) =>
    setOperatorIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  const selectedUsers = operatorIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user));
  const existingBeforeIds = (equipment?.beforeImageIds ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((id) => !pendingDeletedImageIds.includes(id));
  const existingAfterIds = (equipment?.afterImageIds ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((id) => !pendingDeletedImageIds.includes(id));
  const addImages = (
    files: FileList | null,
    current: File[],
    existingCount: number,
    setter: (files: File[]) => void,
  ) => {
    if (!files) return;
    setter([
      ...current,
      ...Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, Math.max(0, 4 - existingCount - current.length)),
    ]);
  };
  const updateDetail = (index: number, content: string) =>
    setDetails((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((value, itemIndex) =>
        itemIndex === index ? content : value,
      ),
    }));
  const addDetail = () =>
    setDetails((current) => ({
      ...current,
      [activeSection]: [...current[activeSection], ""],
    }));
  const removeDetail = (index: number) =>
    setDetails((current) => ({
      ...current,
      [activeSection]: current[activeSection].filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));

  const save = async () => {
    if (!equipment || saving) return;
    const workDetails = sections.flatMap(({ value }) => {
      const lines = details[value].map((line) => line.trim());
      const previousCount = loadedWorkDetails
        .filter((item) => item.section === value)
        .reduce((highest, item) => Math.max(highest, item.itemNo), 0);
      return Array.from(
        { length: Math.max(lines.length, previousCount, 1) },
        (_, index) => ({
          section: value,
          itemNo: index + 1,
          itemContent: lines[index] ?? null,
        }),
      );
    });
    try {
      setSaving(true);
      setMessage("");
      const savedResponse = await savePmEquipmentWorkDetails(
        projectId,
        equipment.id,
        workDetails,
        operatorIds,
        statusMode,
      );
      let savedEquipment = savedResponse.equipment;
      for (const imageId of pendingDeletedImageIds) {
        const deleted = await deletePmEquipmentImage(
          projectId,
          equipment.id,
          imageId,
        );
        savedEquipment = deleted.equipment;
      }
      const uploaded =
        beforeImages.length || afterImages.length
          ? await uploadPmEquipmentImages(
              projectId,
              equipment.id,
              beforeImages,
              afterImages,
            )
          : null;
      if (uploaded) savedEquipment = uploaded.equipment;
      onSaved(savedEquipment);
      onOpenChange(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "บันทึกรายละเอียดไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className="dms-modal dms-equipment-detail-modal"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="dms-modal-title">
            {readOnly ? "ข้อมูลอุปกรณ์" : "กรอกรายละเอียด"}
          </Dialog.Title>
          <Dialog.Description className="dms-modal-subtitle">
            {equipment?.equipmentName}
            {equipment?.equipmentModel ? ` • ${equipment.equipmentModel}` : ""}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" className="modal-close" aria-label="ปิด">
              <FaXmark />
            </button>
          </Dialog.Close>
          <div className="dms-equipment-detail-body">
            {equipment?.faultSymptom && (
              <div className="dms-equipment-detail-symptom">
                <span>อาการขัดข้อง</span>
                <p>{equipment.faultSymptom}</p>
              </div>
            )}
            {loading ? (
              <p className="dms-equipment-detail-state">กำลังโหลด...</p>
            ) : (
              <div className="dms-equipment-simple-form">
                <div className="dms-equipment-detail-controls">
                <div className="dms-equipment-simple-operators">
                  <span>ผู้ดำเนินการ</span>
                  {readOnly ? (
                    <div className="dms-equipment-read-value">
                      {selectedUsers.length
                        ? selectedUsers.map((user) => user.name).join(" • ")
                        : "ยังไม่กำหนด"}
                    </div>
                  ) : (
                    <>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="dms-equipment-simple-trigger"
                          >
                            <span>
                              {selectedUsers.length
                                ? selectedUsers
                                    .map((user) => user.name)
                                    .join(", ")
                                : "เลือกผู้ดำเนินการ"}
                            </span>
                            <FaChevronDown />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="dms-equipment-simple-menu"
                            align="start"
                            sideOffset={6}
                          >
                            <input
                              value={operatorSearch}
                              onChange={(event) =>
                                setOperatorSearch(event.target.value)
                              }
                              onKeyDown={(event) => event.stopPropagation()}
                              placeholder="ค้นหาผู้ใช้งาน"
                            />
                            {filteredUsers.map((user) => {
                              const selected = operatorIds.includes(user.id);
                              return (
                                <DropdownMenu.CheckboxItem
                                  key={user.id}
                                  className="dms-equipment-simple-user"
                                  checked={selected}
                                  disabled={
                                    !selected && operatorIds.length >= 3
                                  }
                                  onCheckedChange={() =>
                                    toggleOperator(user.id)
                                  }
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <i>{selected && <FaCheck />}</i>
                                  <span>
                                    <strong>{user.name}</strong>
                                    <small>
                                      {user.department || user.email}
                                    </small>
                                  </span>
                                </DropdownMenu.CheckboxItem>
                              );
                            })}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                      <small>เลือกได้สูงสุด 3 คน</small>
                    </>
                  )}
                </div>
                <div className="dms-equipment-simple-status">
                  <span>สถานะการดำเนินงาน</span>
                  {readOnly ? (
                    <div className="dms-equipment-read-value">
                      {equipment?.workOrderStatus === "on_hold"
                        ? "ระงับ"
                        : equipment?.workOrderStatus === "waiting_parts"
                          ? "รออะไหล่"
                          : "ตามความคืบหน้าของข้อมูล"}
                    </div>
                  ) : (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="dms-equipment-simple-trigger"
                        >
                          <span>{statusModeLabels[statusMode]}</span>
                          <FaChevronDown />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="dms-equipment-simple-menu dms-equipment-status-menu"
                          align="start"
                          sideOffset={6}
                        >
                          <DropdownMenu.RadioGroup
                            value={statusMode}
                            onValueChange={(nextValue) => setStatusMode(nextValue as StatusMode)}
                          >
                            {(Object.entries(statusModeLabels) as Array<[StatusMode, string]>).map(([value, label]) => (
                              <DropdownMenu.RadioItem
                                key={value}
                                className="dms-equipment-status-menu-item"
                                value={value}
                              >
                                <i>{statusMode === value && <FaCheck />}</i>
                                <span>{label}</span>
                              </DropdownMenu.RadioItem>
                            ))}
                          </DropdownMenu.RadioGroup>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  )}
                  {!readOnly && (
                    <small>
                      โหมดอัตโนมัติจะคำนวณจากผลตรวจสอบ วิธีแก้ไข ผลตรวจซ่อม และรูปภาพ
                    </small>
                  )}
                </div>
                </div>
                <div className="dms-equipment-detail-tabs" role="tablist">
                  {sections.map((section) => (
                    <button
                      key={section.value}
                      type="button"
                      role="tab"
                      aria-selected={activeSection === section.value}
                      className={
                        activeSection === section.value ? "is-active" : ""
                      }
                      onClick={() => setActiveSection(section.value)}
                    >
                      {section.label}
                      <span>
                        {details[section.value].filter((value) => value.trim())
                          .length || ""}
                      </span>
                    </button>
                  ))}
                </div>
                <section className="dms-equipment-tab-panel">
                  <div className="dms-equipment-tab-heading">
                    <div>
                      <h3>
                        {
                          sections.find(
                            (section) => section.value === activeSection,
                          )?.label
                        }
                      </h3>
                      {!readOnly && <p>เพิ่มเฉพาะจำนวนรายการที่ต้องใช้</p>}
                    </div>
                    {!readOnly && (
                      <button type="button" onClick={addDetail}>
                        + เพิ่มรายการ
                      </button>
                    )}
                  </div>
                  {readOnly ? (
                    details[activeSection].some((content) => content.trim()) ? (
                      details[activeSection]
                        .filter((content) => content.trim())
                        .map((content, index) => (
                          <div
                            key={`${activeSection}-${index}`}
                            className="dms-equipment-read-row"
                          >
                            <span>
                              {sections.findIndex(
                                (section) => section.value === activeSection,
                              ) + 1}
                              .{index + 1}
                            </span>
                            <p>{content}</p>
                          </div>
                        ))
                    ) : (
                      <p className="dms-equipment-empty-value">
                        ยังไม่มีข้อมูล
                      </p>
                    )
                  ) : (
                    details[activeSection].map((content, index) => (
                      <div
                        key={`${activeSection}-${index}`}
                        className="dms-equipment-detail-row"
                      >
                        <span>
                          {sections.findIndex(
                            (section) => section.value === activeSection,
                          ) + 1}
                          .{index + 1}
                        </span>
                        <textarea
                          rows={3}
                          value={content}
                          onChange={(event) =>
                            updateDetail(index, event.target.value)
                          }
                          placeholder={
                            sections.find(
                              (section) => section.value === activeSection,
                            )?.placeholder
                          }
                        />
                        {details[activeSection].length > 1 && (
                          <button
                            type="button"
                            aria-label={`ลบรายการ ${index + 1}`}
                            onClick={() => removeDetail(index)}
                          >
                            <FaXmark />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </section>
                <section className="dms-equipment-images">
                  <div className="dms-equipment-detail-heading">
                    <h3>รูปภาพ</h3>
                    <small>ก่อนและหลัง อย่างละไม่เกิน 4 รูป</small>
                  </div>
                  <div className="dms-equipment-image-groups">
                    {(
                      [
                        {
                          key: "before",
                          label: "ก่อนดำเนินงาน",
                          existing: existingBeforeIds,
                          files: beforeImages,
                          setFiles: setBeforeImages,
                        },
                        {
                          key: "after",
                          label: "หลังดำเนินงาน",
                          existing: existingAfterIds,
                          files: afterImages,
                          setFiles: setAfterImages,
                        },
                      ] as const
                    ).map((group) => (
                      <div
                        key={group.key}
                        className="dms-equipment-image-group"
                      >
                        <strong>{group.label}</strong>
                        <div className="dms-equipment-image-list">
                          {group.existing.map((id) => {
                            const source = pmEquipmentImageUrl(
                              projectId,
                              equipment!.id,
                              id,
                            );
                            return <div key={id}>
                              <img
                                src={source}
                                alt={group.label}
                                role="button"
                                tabIndex={0}
                                onClick={() => setPreviewImage(source)}
                              />
                              {!readOnly && <button type="button" disabled={saving} aria-label="นำรูปภาพออก" onClick={() => setPendingDeletedImageIds((current) => [...current, id])}><FaXmark /></button>}
                            </div>;
                          })}
                          {group.files.map((file, index) => (
                            <div key={`${file.name}-${index}`}>
                              <img
                                role="button"
                                tabIndex={0}
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                onClick={(event) =>
                                  setPreviewImage(
                                    event.currentTarget.currentSrc,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  )
                                    setPreviewImage(
                                      event.currentTarget.currentSrc,
                                    );
                                }}
                              />
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    group.setFiles(
                                      group.files.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <FaXmark />
                                </button>
                              )}
                            </div>
                          ))}
                          {!readOnly &&
                            group.existing.length + group.files.length < 4 && (
                              <label className="dms-equipment-image-add">
                                <FaPlus />
                                <span>เพิ่มรูป</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(event) => {
                                    addImages(
                                      event.target.files,
                                      group.files,
                                      group.existing.length,
                                      group.setFiles,
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          {readOnly && group.existing.length === 0 && (
                            <span className="dms-equipment-empty-image">
                              <FaImage /> ไม่มีรูปภาพ
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
          {message && (
            <p className="dms-equipment-save-error" role="alert">
              {message}
            </p>
          )}
          <div className="dms-equipment-form-footer">
            <button
              type="button"
              className="dms-back-btn"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "ปิด" : "ยกเลิก"}
            </button>
            {!readOnly && (
              <button
                type="button"
                className="dms-create-btn"
                disabled={loading || saving}
                onClick={() => void save()}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            )}
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
