import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "../../../../components/toast-provider";
import { createDocument, updateDocument } from "../../services/documentsService";
import { PmLocationPicker } from "./pm-location-picker";

interface PmDocumentFormValues {
  projectName: string;
  customerName: string;
  projectManager: string;
  siteAddress: string;
  latitude: string;
  longitude: string;
  projectDescription: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

interface PmDocumentFormProps {
  mode: "create" | "edit";
  documentId?: number;
  documentTypeId: number;
  initialValues?: Partial<PmDocumentFormValues>;
  onClose: () => void;
  onSaved: () => void;
}

const REQUIRED_FIELD_MESSAGE = "กรุณาระบุข้อมูล";

export function PmDocumentForm({
  mode,
  documentId,
  documentTypeId,
  initialValues,
  onClose,
  onSaved,
}: PmDocumentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<PmDocumentFormValues>({
    defaultValues: {
      projectName: initialValues?.projectName ?? "",
      customerName: initialValues?.customerName ?? "",
      projectManager: initialValues?.projectManager ?? "",
      siteAddress: initialValues?.siteAddress ?? "",
      latitude: initialValues?.latitude ?? "13.756300",
      longitude: initialValues?.longitude ?? "100.501800",
      projectDescription: initialValues?.projectDescription ?? "",
      plannedStartDate: initialValues?.plannedStartDate ?? "",
      plannedEndDate: initialValues?.plannedEndDate ?? "",
    },
  });

  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        if (!documentTypeId) {
          throw new Error("ไม่พบประเภทเอกสารสำหรับการบันทึก");
        }

        setIsSubmitting(true);

      const payload = {
        projectName: values.projectName.trim(),
        description: values.projectDescription.trim() || null,
        documentTypeId,
        projectManagerName: values.projectManager.trim() || "System",
        customerName: values.customerName.trim() || null,
        siteAddress: values.siteAddress.trim() || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        plannedStartDate: values.plannedStartDate || null,
        plannedEndDate: values.plannedEndDate || null,
      };

        if (mode === "edit") {
          if (!documentId) throw new Error("ไม่พบเอกสารที่ต้องการแก้ไข");
          await updateDocument(documentId, payload);
        } else {
          await createDocument(payload);
        }

        showToast(mode === "edit" ? "แก้ไขโครงการ PM สำเร็จ" : "บันทึกโครงการ PM สำเร็จ", "success");
        onSaved();
        onClose();
      } catch (error) {
        console.error("Failed to create PM document", error);
        showToast(
          error instanceof Error ? error.message : "บันทึกโครงการ PM ไม่สำเร็จ",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    (errors) => {
      const firstErrorMessage =
        errors.projectName?.message ??
        errors.customerName?.message ??
        errors.siteAddress?.message ??
        errors.plannedStartDate?.message ??
        errors.plannedEndDate?.message ??
        "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน";

      const firstErrorField =
        errors.projectName ? "projectName" :
        errors.customerName ? "customerName" :
        errors.siteAddress ? "siteAddress" :
        errors.plannedStartDate ? "plannedStartDate" :
        errors.plannedEndDate ? "plannedEndDate" : null;

      if (firstErrorField) {
        setFocus(firstErrorField);
      }

      showToast(firstErrorMessage, "error");
    },
  );

  return (
    <form className="dms-pm-create-form" onSubmit={onSubmit} autoComplete="off">
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">
            ชื่อโครงการ  <span className="dms-form-required">*</span>
            {errors.projectName ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.projectName.message}
              </span>
            ) : null}
          </span>
          <input
            type="text"
            className="dms-form-input"
            placeholder="เช่น ระบบกล้องวงจรปิดสำนักงานใหญ่"
            autoComplete="off"
            {...register("projectName", {
              required: REQUIRED_FIELD_MESSAGE,
            })}
          />
        </label>

        <label className="dms-form-field">
          <span className="dms-form-label">
            ลูกค้า / ผู้ว่าจ้าง <span className="dms-form-required">*</span>
            {errors.customerName ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.customerName.message}
              </span>
            ) : null}
          </span>
          <input
            type="text"
            className="dms-form-input"
            placeholder="ระบุชื่อลูกค้า / ผู้ว่าจ้าง"
            autoComplete="off"
            {...register("customerName", {
              required: REQUIRED_FIELD_MESSAGE,
            })}
          />
        </label>

        <label className="dms-form-field">
          <span className="dms-form-label">ผู้จัดการโครงการ</span>
          <input
            type="text"
            className="dms-form-input"
            placeholder="ระบุชื่อผู้จัดการโครงการ"
            autoComplete="off"
            {...register("projectManager")}
          />
        </label>

        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">
            ที่อยู่ / สถานที่ <span className="dms-form-required">*</span>
            {errors.siteAddress ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.siteAddress.message}
              </span>
            ) : null}
          </span>
          <textarea
            className="dms-form-input dms-form-textarea dms-form-textarea--sm"
            placeholder="ระบุสถานที่ติดตั้ง / พื้นที่ดำเนินงาน"
            autoComplete="off"
            {...register("siteAddress", {
              required: REQUIRED_FIELD_MESSAGE,
            })}
          />
        </label>
      </div>

      <section className="dms-pm-create-section">
        <div className="dms-pm-create-section-head">
          <h4>ตำแหน่งพิกัด</h4>
          <p>ค้นหาสถานที่บนแผนที่หรือคลิกเลือกจุดหน้างานได้ในพื้นที่เดียวกัน</p>
        </div>

        <PmLocationPicker
          latitude={latitude}
          longitude={longitude}
          onChange={({ latitude: nextLatitude, longitude: nextLongitude }) => {
            setValue("latitude", nextLatitude, { shouldDirty: true });
            setValue("longitude", nextLongitude, { shouldDirty: true });
          }}
        />

        <input type="hidden" {...register("latitude")} />
        <input type="hidden" {...register("longitude")} />
      </section>

      <section className="dms-pm-create-section">
        <div className="dms-pm-create-grid">
          <label className="dms-form-field dms-form-field--full">
            <span className="dms-form-label">รายละเอียดโครงการ</span>
            <textarea
              className="dms-form-input dms-form-textarea"
              placeholder="อธิบายขอบเขตงาน / หมายเหตุสำคัญ / รายละเอียดหน้างาน"
              autoComplete="off"
              {...register("projectDescription")}
            />
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">
              วันที่วางแผนเริ่มดำเนินงาน <span className="dms-form-required">*</span>
              {errors.plannedStartDate ? (
                <span className="dms-form-error dms-form-error--inline">
                  {errors.plannedStartDate.message}
                </span>
              ) : null}
            </span>
            <input
              type="date"
              className="dms-form-input"
              autoComplete="off"
              {...register("plannedStartDate", {
                required: REQUIRED_FIELD_MESSAGE,
              })}
            />
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">
              วันที่วางแผนเสร็จงาน <span className="dms-form-required">*</span>
              {errors.plannedEndDate ? (
                <span className="dms-form-error dms-form-error--inline">
                  {errors.plannedEndDate.message}
                </span>
              ) : null}
            </span>
            <input
              type="date"
              className="dms-form-input"
              autoComplete="off"
              {...register("plannedEndDate", {
                required: REQUIRED_FIELD_MESSAGE,
              })}
            />
          </label>
        </div>
      </section>

      <div className="dms-pm-create-footer">
        <button type="button" className="dms-back-btn" onClick={onClose}>
          ปิดหน้าต่าง
        </button>
        <button type="submit" className="dms-pm-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : mode === "edit" ? "บันทึกการแก้ไข" : "บันทึกโครงการ"}
        </button>
      </div>
    </form>
  );
}
