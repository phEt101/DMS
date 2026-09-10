import { useState } from "react";
import type { SyntheticEvent } from "react";

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
  useErrorToast(error);
  const authTranslations = translations.auth;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
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
        <div className="signin-logo">
          <span className="brand-mark boswell-logo-mark">
            <span />
          </span>
          <div>
            <strong>Boswell</strong>
            <span>{authTranslations.productName}</span>
          </div>
        </div>
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
            <label className="signin-field">
              <span>{authTranslations.email}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={authTranslations.emailPlaceholder}
                autoComplete="email"
                maxLength={255}
                required
                autoFocus
              />
            </label>

            <label className="signin-field">
              <span>{authTranslations.password}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={authTranslations.passwordPlaceholder}
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
              {isSubmitting ? authTranslations.signingIn : authTranslations.signIn}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
