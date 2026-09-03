import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getLocale } from "../locales";
import type { AuthUser } from "../features/auth/types/auth.types";

function TopbarIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function Topbar({
  user,
  language = "th",
  onLanguageToggle,
  onMenuClick,
  onLogout,
}: {
  user: AuthUser;
  language?: "th" | "en";
  onLanguageToggle?: () => void;
  onMenuClick?: () => void;
  onLogout: () => Promise<void>;
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isThai = language === "th";
  const t = getLocale(language).topbar;
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      setProfileOpen(false);
    } catch (error) {
      console.error("Unable to sign out", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button menu-button"
          onClick={onMenuClick}
          aria-label={t.openNav}
        >
          <TopbarIcon>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </TopbarIcon>
        </button>
      </div>
      <div className="topbar-actions">
        <button
          className="icon-button notification-button"
          aria-label={t.notifications}
        >
          <TopbarIcon>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </TopbarIcon>
          <span />
        </button>
        <button
          className="language-switch"
          onClick={onLanguageToggle}
          aria-label={isThai ? t.switchToEnglish : t.switchToThai}
        >
          <span className={`language-chip ${isThai ? "is-active" : ""}`}>
            TH
          </span>
          <span className={`language-chip ${!isThai ? "is-active" : ""}`}>
            EN
          </span>
        </button>
        <div className="profile-divider" />
        <div className="profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="profile-button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{user.role.name}</small>
            </span>
            <span className={`profile-chevron ${profileOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {profileOpen && (
            <div className="profile-popup" role="menu">
              <div className="profile-popup-summary">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>{user.role.name}</small>
              </div>
              <button
                type="button"
                className="profile-logout"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                role="menuitem"
              >
                <span aria-hidden="true">↪</span>
                {isLoggingOut ? t.loggingOut : t.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
