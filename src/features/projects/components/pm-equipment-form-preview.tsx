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
import type { CommonTranslations, ProjectTranslations } from "../page";

export function PmEquipmentFormPreview({
  open,
  projectId,
  equipment = null,
  onOpenChange,
  onSaved,
  projectTranslations,
  commonTranslations,
}: {
  open: boolean;
  projectId: string;
  equipment?: PmEquipment | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (equipment: PmEquipment) => void;
  projectTranslations: ProjectTranslations["equipmentForm"];
  commonTranslations: CommonTranslations;
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
        error instanceof Error ? error.message : projectTranslations.saveError,
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
      setSaveError(projectTranslations.maxImages);
      return;
    }
    if (validImages.length !== selected.length) {
      setSaveError(projectTranslations.invalidImage);
    } else if (validImages.length > available) {
      setSaveError(projectTranslations.remainingImages.replace("{count}", String(available)));
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
            {equipment ? projectTranslations.editTitle : projectTranslations.addTitle}
          </Dialog.Title>
          <Dialog.Description className="dms-modal-subtitle">
            {equipment
              ? projectTranslations.editSubtitle
              : projectTranslations.addSubtitle}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" className="modal-close" aria-label={commonTranslations.actions.close}>
              <FaXmark />
            </button>
          </Dialog.Close>
          <div className="dms-equipment-form-body">
            <div className="dms-equipment-form-grid">
              <label className="dms-equipment-field">
                <span>
                  {projectTranslations.name} <b>*</b>
                </span>
                <input
                  value={equipmentName}
                  onChange={(event) => setEquipmentName(event.target.value)}
                  placeholder={projectTranslations.namePlaceholder}
                />
              </label>
              <label className="dms-equipment-field">
                <span>{projectTranslations.model}</span>
                <input
                  value={equipmentModel}
                  onChange={(event) => setEquipmentModel(event.target.value)}
                  placeholder={projectTranslations.modelPlaceholder}
                />
              </label>
              <label className="dms-equipment-field is-full">
                <span>{projectTranslations.faultSymptom}</span>
                <textarea
                  value={faultSymptom}
                  onChange={(event) => setFaultSymptom(event.target.value)}
                  rows={3}
                  placeholder={projectTranslations.faultPlaceholder}
                />
              </label>
              <label className="dms-equipment-field is-full">
                <span>{projectTranslations.remarks}</span>
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  placeholder={projectTranslations.remarksPlaceholder}
                />
              </label>
              <section className="dms-equipment-reference-images is-full">
                <div>
                  <strong>{projectTranslations.images}</strong>
                  <small>{projectTranslations.imagesHelp}</small>
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
                        alt={projectTranslations.imageAlt}
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewImage(source)}
                      />
                      <button type="button" disabled={saving} aria-label={commonTranslations.actions.removeImage} onClick={() => setPendingDeletedImageIds((current) => [...current, id])}><FaXmark /></button>
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
                          aria-label={projectTranslations.deleteImage.replace("{name}", file.name)}
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
                      <span>{commonTranslations.actions.addImage}</span>
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
              {commonTranslations.actions.cancel}
            </button>
            <button
              type="button"
              className="dms-create-btn"
              disabled={!equipmentName.trim() || saving}
              onClick={() => void saveEquipment()}
            >
              {saving
                ? commonTranslations.states.saving
                : equipment
                  ? commonTranslations.actions.saveChanges
                  : projectTranslations.save}
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
            aria-label={projectTranslations.preview}
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              aria-label={commonTranslations.actions.closeImage}
              onClick={() => setPreviewImage(null)}
            >
              <FaXmark />
            </button>
            <img
              src={previewImage}
              alt={projectTranslations.preview}
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </Dialog.Root>
  );
}
