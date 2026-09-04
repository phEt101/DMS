import { useState } from "react";
import type { SyntheticEvent } from "react";

import { getLocale } from "../../locales";
import type { Language } from "../../locales";
import { useAuth } from "./hooks/use-auth";
import { useErrorToast } from "../../components/toast-provider";

export default function LoginPage({
  language,
  onLanguageToggle,
}: {
  language: Language;
  onLanguageToggle: () => void;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useErrorToast(error);
  const t = getLocale(language).auth;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch {
      setError(t.loginError);
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
            <span>{t.productName}</span>
          </div>
        </div>
        <button
          type="button"
          className="signin-language"
          onClick={onLanguageToggle}
          aria-label={t.switchLanguage}
        >
          <span className={language === "th" ? "is-active" : ""}>TH</span>
          <span className={language === "en" ? "is-active" : ""}>EN</span>
        </button>
      </header>

      <section className="signin-shell">
        <aside className="signin-showcase" aria-label={t.brandLabel}>
          <div className="signin-showcase-copy">
            <p>{t.kicker}</p>
            <h1>{t.brandTitle}</h1>
            <span>{t.brandSubtitle}</span>
          </div>
        </aside>

        <div className="signin-card">
          <header>
            <p>{t.welcome}</p>
            <h2>{t.title}</h2>
            <span>{t.subtitle}</span>
          </header>

          <form onSubmit={handleSubmit}>
            <label className="signin-field">
              <span>{t.email}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                maxLength={255}
                required
                autoFocus
              />
            </label>

            <label className="signin-field">
              <span>{t.password}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                autoComplete="current-password"
                maxLength={255}
                required
              />
            </label>

            <button
              type="submit"
              className="signin-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.signingIn : t.signIn}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
