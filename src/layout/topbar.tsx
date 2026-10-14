import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Translations } from "../locales";
import type { AuthUser } from "../features/auth/types/auth.types";
import type { PageKey } from "../services/routes/pageTypes";

type TopbarNotification = { id: number; title: string; body: string; date: string; read: boolean };
const TOPBAR_NOTIFICATION_KEY = "boswell-topbar-notifications-mock";
const INITIAL_TOPBAR_NOTIFICATIONS: TopbarNotification[] = [
  { id: 1, title: "ใบลาของสมชาย ใจดี รอ HR ตรวจ", body: "ลากิจ 30 ต.ค. 2569 · 1 วัน", date: "วันนี้ · 10:00", read: false },
  { id: 2, title: "ใบ OT ของวีระ ศรีสุข รอพิจารณา", body: "14 ต.ค. 2569 · 18:00–20:30 · 2.5 ชั่วโมง", date: "วันนี้ · 09:00", read: false },
  { id: 3, title: "ผู้จัดการอนุมัติใบลาของคุณแล้ว", body: "เอกสารส่งต่อให้ HR ตรวจแล้ว", date: "เมื่อวาน · 15:00", read: true },
];

function readTopbarNotifications(): TopbarNotification[] {
  try {
    const stored = localStorage.getItem(TOPBAR_NOTIFICATION_KEY);
    return stored ? JSON.parse(stored) as TopbarNotification[] : INITIAL_TOPBAR_NOTIFICATIONS;
  } catch {
    return INITIAL_TOPBAR_NOTIFICATIONS;
  }
}

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
  translations,
  language = "th",
  onLanguageToggle,
  onMenuClick,
  onNavigate,
  onLogout,
}: {
  user: AuthUser;
  translations: Translations;
  language?: "th" | "en";
  onLanguageToggle?: () => void;
  onMenuClick?: () => void;
  onNavigate?: (page: PageKey) => void;
  onLogout: () => Promise<void>;
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mockNotifications, setMockNotifications] = useState(readTopbarNotifications);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const isThai = language === "th";
  const topbarTranslations = translations.topbar;
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

  useEffect(() => {
    try { localStorage.setItem(TOPBAR_NOTIFICATION_KEY, JSON.stringify(mockNotifications)); } catch { /* mock storage is optional */ }
  }, [mockNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const unreadCount = mockNotifications.filter((notification) => !notification.read).length;
  const markAllNotificationsRead = () => setMockNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  const openNotificationsPage = (notificationId?: number) => {
    if (notificationId !== undefined) {
      setMockNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification));
    }
    setNotificationsOpen(false);
    onNavigate?.("documents-notifications");
  };

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
          aria-label={topbarTranslations.openNav}
        >
          <TopbarIcon>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </TopbarIcon>
        </button>
      </div>
      <div className="topbar-actions">
        <div className="notification-menu" ref={notificationsRef}>
          <button
            type="button"
            className="icon-button notification-button"
            aria-label={`${topbarTranslations.notifications}${unreadCount ? `, ${unreadCount}` : ""}`}
            aria-expanded={notificationsOpen}
            aria-controls="topbar-notifications-panel"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <TopbarIcon>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </TopbarIcon>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          {notificationsOpen && <section className="topbar-notifications" id="topbar-notifications-panel" aria-label={topbarTranslations.notifications}>
            <header><strong>{isThai ? "การแจ้งเตือน" : "Notifications"}</strong><button type="button" onClick={markAllNotificationsRead}>{isThai ? "อ่านทั้งหมด" : "Mark all read"}</button></header>
            <div className="topbar-notification-list">{mockNotifications.map((notification) => <button type="button" key={notification.id} className={`topbar-notification ${notification.read ? "" : "is-unread"}`} onClick={() => openNotificationsPage(notification.id)}><span className="topbar-notification-mark" aria-hidden="true" /><span className="topbar-notification-copy"><strong>{notification.title}</strong><small>{notification.body}</small><time>{notification.date}</time></span></button>)}</div>
            <button type="button" className="topbar-notifications-all" onClick={() => openNotificationsPage()}>{isThai ? "ดูการแจ้งเตือนทั้งหมด" : "View all notifications"}</button>
          </section>}
        </div>
        <button
          className="language-switch"
          onClick={onLanguageToggle}
          aria-label={isThai ? topbarTranslations.switchToEnglish : topbarTranslations.switchToThai}
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
                {isLoggingOut ? topbarTranslations.loggingOut : topbarTranslations.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
