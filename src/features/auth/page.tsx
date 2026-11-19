import { useState } from "react";
import type { SyntheticEvent } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import type { Language, Translations } from "../../locales";
import { useAuth } from "./hooks/use-auth";
import { useErrorToast } from "../../components/toast-provider";

export default function LoginPage({
  translations,
  language,
  onLanguageToggle,
}: {
  translations: Translations;
  language: Language;
  onLanguageToggle: () => void;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // รายการโดเมน + ชื่อย่อ: พิมพ์ @bo → boswell.co.th, @bi → gmoney.co.th
  const DOMAIN_ALIASES: Record<string, string> = {
    bo: "boswell.co.th",
    bi: "bigmoney.co.th",
  };
  const DOMAIN_LIST = Array.from(new Set(Object.values(DOMAIN_ALIASES)));
  const [showDomains, setShowDomains] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useErrorToast(error);
  const authTranslations = translations.auth;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    // ถ้าผู้ใช้ไม่ได้พิมพ์ @ ให้เติม @boswell.co.th ต่อท้ายให้อัตโนมัติ
    const formattedEmail = email.includes("@")
      ? email.trim()
      : `${email.trim()}@boswell.co.th`;

    try {
      await login({ email: formattedEmail, password });
    } catch {
      setError(authTranslations.loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signin-page">
      <div className="signin-orb signin-orb--one" />
      <div className="signin-orb signin-orb--two" />

      <header className="signin-header">
        
        <button
          type="button"
          className="signin-language"
          onClick={onLanguageToggle}
          aria-label={authTranslations.switchLanguage}
        >
          <span className={language === "th" ? "is-active" : ""}>TH</span>
          <span className={language === "en" ? "is-active" : ""}>EN</span>
        </button>
      </header>

      <section className="signin-shell">
        <aside className="signin-showcase" aria-label={authTranslations.brandLabel}>
          <div className="signin-showcase-copy">
            <p>{authTranslations.kicker}</p>
            <h1>{authTranslations.brandTitle}</h1>
            <span>{authTranslations.brandSubtitle}</span>
          </div>
        </aside>

        <div className="signin-card">
          <header>
            <p>{authTranslations.welcome}</p>
            <h2>{authTranslations.title}</h2>
            <span>{authTranslations.subtitle}</span>
          </header>

          <form onSubmit={handleSubmit}>
            <label
              className="signin-field"
              style={{ position: "relative" }}
            >
              <span>{authTranslations.email}</span>
              <input
                type="text"
                inputMode="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  // แสดงรายการโดเมนเมื่อพิมพ์ "@" ตามด้วยตัวอักษร
                  setShowDomains(/@\S*$/.test(event.target.value));
                }}
                onFocus={() => setShowDomains(/@\S*$/.test(email))}
                onBlur={() => setShowDomains(false)}
                placeholder={authTranslations.emailPlaceholder}
                autoComplete="email"
                maxLength={255}
                required
              />
              {showDomains && (() => {
                const afterAt = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
                // ชื่อย่อตรงเป๊ะ (เช่น @bo, @bi) → โชว์โดเมนนั้นทันที
                const aliased = DOMAIN_ALIASES[afterAt];
                const matches = aliased
                  ? [aliased]
                  : DOMAIN_LIST.filter((d) => d.startsWith(afterAt));
                if (matches.length === 0) return null;
                return (
                  <ul
                    className="signin-domain-list"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      listStyle: "none",
                      margin: 4,
                      padding: 4,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {matches.map((domain) => (
                      <li key={domain}>
                        <button
                          type="button"
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 12px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            borderRadius: 6,
                          }}
                          onMouseDown={(event) => {
                            // ใช้ onMouseDown เพื่อกัน onBlur ปิดรายการก่อนคลิก
                            event.preventDefault();
                            setEmail(
                              `${email.slice(0, email.lastIndexOf("@"))}@${domain}`
                            );
                            setShowDomains(false);
                          }}
                        >
                          {email.slice(0, email.lastIndexOf("@"))}@{domain}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </label>
            <label className="signin-field">
              <span>{authTranslations.password}</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={authTranslations.passwordPlaceholder}
                autoComplete="current-password"
                maxLength={255}
                required
              />
              <button
                type="button"
                className="signin-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </label>

            <button
              type="submit"
              className="signin-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? authTranslations.signingIn : authTranslations.signIn}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
