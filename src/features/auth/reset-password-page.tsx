// ⚠️ หน้ารีเซ็ทรหัสผ่านแบบไม่ตรวจสอบตัวตน (ใช้เพื่อการทดสอบเท่านั้น — ต้องลบก่อนขึ้น production)
import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { Language, Translations } from "../../locales";
import { apiUrl } from "../../services/api";

// ⚠️ หน้ารีเซ็ทรหัสผ่านแบบไม่ตรวจสอบตัวตน (ใช้เพื่อการทดสอบเท่านั้น — ต้องลบก่อนขึ้น production)
// ใส่แค่อีเมล + รหัสผ่านใหม่ เปลี่ยนรหัสผ่านได้ทันที
export default function ResetPasswordPage({
  translations,
  language,
  onLanguageToggle,
  onBackToLogin,
}: {
  translations: Translations;
  language: Language;
  onLanguageToggle: () => void;
  onBackToLogin: () => void;
}) {
  const a = translations.auth;
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError(language === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(language === "th" ? "รหัสผ่านทั้งสองช่องไม่ตรงกัน" : "Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
      });
      if (response.status === 204) {
        setDone(true);
      } else {
        const json = await response.json().catch(() => ({}));
        setError(
          language === "th"
            ? (json.message === "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ" ? json.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
            : (json.message ?? "Something went wrong, please try again"),
        );
      }
    } catch {
      setError(language === "th" ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" : "Cannot connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signin-page">
      <div className="signin-orb signin-orb--one" />
      <div className="signin-orb signin-orb--two" />

      <header className="signin-header">
        <div className="signin-logo">
          <span className="brand-mark boswell-logo-mark">
            <span />
          </span>
          <div>
            <strong>Boswell</strong>
            <span>{a.productName}</span>
          </div>
        </div>
        <button type="button" className="signin-language" onClick={onLanguageToggle} aria-label={a.switchLanguage}>
          <span className={language === "th" ? "is-active" : ""}>TH</span>
          <span className={language === "en" ? "is-active" : ""}>EN</span>
        </button>
      </header>

      <section className="signin-shell">
        <aside className="signin-showcase" aria-label={a.brandLabel}>
          <div className="signin-showcase-copy">
            <p>{language === "th" ? "รีเซ็ทรหัสผ่าน" : "Reset password"}</p>
            <h1>{a.brandTitle}</h1>
            <span>{a.brandSubtitle}</span>
          </div>
        </aside>

        <div className="signin-card">
          {done ? (
            <>
              <header>
                <p>{language === "th" ? "สำเร็จ" : "Success"}</p>
                <h2>{language === "th" ? "เปลี่ยนรหัสผ่านแล้ว" : "Password updated"}</h2>
                <span>{language === "th" ? "กรุณาล็อกอินด้วยรหัสผ่านใหม่ (ระบบจะบังคับออกจากทุกเครื่อง)" : "Sign in with your new password (all devices have been signed out)"}</span>
              </header>
              <button type="button" className="signin-submit" onClick={onBackToLogin}>
                {language === "th" ? "ไปหน้าล็อกอิน" : "Go to sign in"}
              </button>
            </>
          ) : (
            <>
              <header>
                <p>{language === "th" ? "รีเซ็ทรหัสผ่าน" : "Reset password"}</p>
                <h2>{language === "th" ? "เปลี่ยนรหัสผ่านด้วยอีเมล" : "Change password by email"}</h2>
                <span>{language === "th" ? "กรอกอีเมลของบัญชี แล้วตั้งรหัสผ่านใหม่ได้ทันที" : "Enter the account email and set a new password instantly"}</span>
              </header>

              <form onSubmit={handleSubmit}>
                <label className="signin-field">
                  <span>{a.email}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={a.emailPlaceholder}
                    autoComplete="email"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="signin-field">
                  <span>{language === "th" ? "รหัสผ่านใหม่" : "New password"}</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={language === "th" ? "อย่างน้อย 8 ตัวอักษร" : "At least 8 characters"}
                    autoComplete="new-password"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="signin-field">
                  <span>{language === "th" ? "ยืนยันรหัสผ่านใหม่" : "Confirm new password"}</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    maxLength={255}
                    required
                  />
                </label>

                {error && <p className="signin-error" role="alert">{error}</p>}

                <button type="submit" className="signin-submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (language === "th" ? "กำลังบันทึก..." : "Saving...")
                    : (language === "th" ? "เปลี่ยนรหัสผ่าน" : "Change password")}
                </button>
                <button type="button" className="signin-reset-link" onClick={onBackToLogin}>
                  {language === "th" ? "← กลับไปหน้าล็อกอิน" : "← Back to sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
// ⚠️ หน้ารีเซ็ทรหัสผ่านแบบไม่ตรวจสอบตัวตน (ใช้เพื่อการทดสอบเท่านั้น — ต้องลบก่อนขึ้น production)
