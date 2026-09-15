import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "../../../../components/toast-provider";
import { createProject, updateProject } from "../../services/projectsService";
import { PmLocationPicker } from "./pm-location-picker";
import type { CommonTranslations, ProjectTranslations } from "../../page";

interface PmProjectFormValues {
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

interface PmProjectFormProps {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
  mode: "create" | "edit";
  projectId?: string;
  projectTypeId: number;
  initialValues?: Partial<PmProjectFormValues>;
  onClose: () => void;
  onSaved: () => void;
}

export function PmProjectForm({
  projectTranslations,
  commonTranslations,
  mode,
  projectId,
  projectTypeId,
  initialValues,
  onClose,
  onSaved,
}: PmProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<PmProjectFormValues>({
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
        if (!projectTypeId) {
          throw new Error(projectTranslations.projectForm.typeMissing);
        }

        setIsSubmitting(true);

      const payload = {
        projectName: values.projectName.trim(),
        description: values.projectDescription.trim() || null,
        projectTypeId,
        projectManagerName: values.projectManager.trim() || "System",
        customerName: values.customerName.trim() || null,
        siteAddress: values.siteAddress.trim() || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        plannedStartDate: values.plannedStartDate || null,
        plannedEndDate: values.plannedEndDate || null,
      };

        if (mode === "edit") {
          if (!projectId) throw new Error(projectTranslations.projectForm.projectMissing);
          await updateProject(projectId, payload);
        } else {
          await createProject(payload);
        }

        showToast(mode === "edit" ? projectTranslations.projectForm.updated : projectTranslations.projectForm.created, "success");
        onSaved();
        onClose();
      } catch (error) {
        console.error("Failed to create PM document", error);
        showToast(
          error instanceof Error ? error.message : projectTranslations.projectForm.saveError,
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
        projectTranslations.projectForm.requiredSummary;

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
            {projectTranslations.projectForm.projectName} <span className="dms-form-required">*</span>
            {errors.projectName ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.projectName.message}
              </span>
            ) : null}
          </span>
          <input
            type="text"
            className="dms-form-input"
            placeholder={projectTranslations.projectForm.projectNamePlaceholder}
            autoComplete="off"
            {...register("projectName", {
              required: projectTranslations.projectForm.required,
            })}
          />
        </label>

        <label className="dms-form-field">
          <span className="dms-form-label">
            {projectTranslations.projectForm.customer} <span className="dms-form-required">*</span>
            {errors.customerName ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.customerName.message}
              </span>
            ) : null}
          </span>
          <input
            type="text"
            className="dms-form-input"
            placeholder={projectTranslations.projectForm.customerPlaceholder}
            autoComplete="off"
            {...register("customerName", {
              required: projectTranslations.projectForm.required,
            })}
          />
        </label>

        <label className="dms-form-field">
          <span className="dms-form-label">{projectTranslations.projectForm.projectManager}</span>
          <input
            type="text"
            className="dms-form-input"
            placeholder={projectTranslations.projectForm.projectManagerPlaceholder}
            autoComplete="off"
            {...register("projectManager")}
          />
        </label>

        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">
            {projectTranslations.projectForm.siteAddress} <span className="dms-form-required">*</span>
            {errors.siteAddress ? (
              <span className="dms-form-error dms-form-error--inline">
                {errors.siteAddress.message}
              </span>
            ) : null}
          </span>
          <textarea
            className="dms-form-input dms-form-textarea dms-form-textarea--sm"
            placeholder={projectTranslations.projectForm.siteAddressPlaceholder}
            autoComplete="off"
            {...register("siteAddress", {
              required: projectTranslations.projectForm.required,
            })}
          />
        </label>
      </div>

      <section className="dms-pm-create-section">
        <div className="dms-pm-create-section-head">
          <h4>{projectTranslations.projectForm.coordinates}</h4>
          <p>{projectTranslations.projectForm.coordinatesHelp}</p>
        </div>

        <PmLocationPicker
          projectTranslations={projectTranslations}
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
            <span className="dms-form-label">{projectTranslations.projectForm.description}</span>
            <textarea
              className="dms-form-input dms-form-textarea"
              placeholder={projectTranslations.projectForm.descriptionPlaceholder}
              autoComplete="off"
              {...register("projectDescription")}
            />
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">
              {projectTranslations.projectForm.startDate} <span className="dms-form-required">*</span>
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
                required: projectTranslations.projectForm.required,
              })}
            />
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">
              {projectTranslations.projectForm.endDate} <span className="dms-form-required">*</span>
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
                required: projectTranslations.projectForm.required,
              })}
            />
          </label>
        </div>
      </section>

      <div className="dms-pm-create-footer">
        <button type="button" className="dms-back-btn" onClick={onClose}>
          {projectTranslations.projectForm.close}
        </button>
        <button type="submit" className="dms-pm-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? commonTranslations.states.saving : mode === "edit" ? commonTranslations.actions.saveChanges : projectTranslations.projectForm.save}
        </button>
      </div>
    </form>
  );
}
