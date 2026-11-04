import { useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

import { useToast } from "../../../components/toast-provider";
import type { Translations } from "../../../locales";
import * as authService from "../services/authService";
import type { AuthUser } from "../types/auth.types";

type Props = {
  mode: "profile" | "password";
  user: AuthUser;
  translations: Translations["topbar"];
  onClose: () => void;
};

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export default function AccountDialog({ mode, user, translations, onClose }: Props) {
  const { showToast } = useToast();
  const initial = splitName(user.name);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "password" && newPassword !== confirmPassword) {
      showToast(translations.passwordMismatch, "error");
      return;
    }
    setSaving(true);
    try {
      if (mode === "profile") {
        await authService.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
        window.dispatchEvent(new Event("dms:user-updated"));
        showToast(translations.profileSaved, "success");
      } else {
        await authService.changePassword({ currentPassword, newPassword });
        showToast(translations.passwordSaved, "success");
      }
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "profile" ? translations.editProfile : translations.changePassword;

  return createPortal(
    <div
      className="modal-backdrop account-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="user-modal account-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <header>
          <div>
            <h2 id="account-dialog-title">{title}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label={translations.close}>
            ×
          </button>
        </header>
        <form onSubmit={(event) => void handleSubmit(event)}>
          {mode === "profile" ? (
            <div className="form-grid">
              <label>
                {translations.firstName}
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={150} required autoFocus />
              </label>
              <label>
                {translations.lastName}
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={150} />
              </label>
            </div>
          ) : (
            <>
              <label>
                {translations.currentPassword}
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required autoFocus />
              </label>
              <label>
                {translations.newPassword}
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={255} required />
              </label>
              <label>
                {translations.confirmPassword}
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={255} required />
              </label>
              <small>{translations.passwordHint}</small>
            </>
          )}
          <footer>
            <button className="secondary-button" type="button" onClick={onClose}>
              {translations.close}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? translations.saving : translations.save}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
