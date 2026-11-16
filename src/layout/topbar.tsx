import AccountDialog from "../features/auth/components/account-dialog";
import { FaLock, FaUserPen } from "react-icons/fa6";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Translations } from "../locales";
import type { AuthUser } from "../features/auth/types/auth.types";
import type { PageKey } from "../services/routes/pageTypes";
import { getManagementCompanyId, setManagementCompanyId } from "../services/api";
import { getCurrentUser } from "../features/auth/services/authService";
import { getBadges, listNotifications, markNotificationsRead } from "../features/doc/services/employee-requests.service";
import {
  listAnnouncementNotifications,
  markAllAnnouncementNotificationsRead,
  markAnnouncementRead,
  type AnnouncementCategory,
} from "../features/doc/announcements/services/announcements.service";
import { avatarSrc } from "../services/avatar";
import { listCompanies, type Company } from "../features/settings/access/companies/services/companies.service";
import { useErrorToast } from "../components/toast-provider";

type TopbarNotification = {
  id: string
  notificationId?: number
  documentId?: number
  announcementId?: number
  mockId?: number
  title: string
  body: string
  date: string
  read: boolean
}
const OPEN_DOCUMENT_KEY = "dms-open-doc";
const OPEN_ANNOUNCEMENT_KEY = "dms-open-announcement";

// เสียงแจ้งเตือน (สร้างด้วย Web Audio API — ไม่ต้องมีไฟล์เสียง)
let notificationSoundCtx: AudioContext | null = null;
const playNotificationSound = () => {
  try {
    notificationSoundCtx ??= new AudioContext();
    if (notificationSoundCtx.state === "suspended") void notificationSoundCtx.resume();
    const ctx = notificationSoundCtx;
    const now = ctx.currentTime;
    for (const [freq, delay] of [[880, 0], [1320, 0.18]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    }
  } catch { /* เบราว์เซอร์ไม่รองรับเสียง — ข้ามไป */ }
};
const TOPBAR_NOTIFICATION_KEY = "boswell-topbar-notifications-mock";
type MockTopbarNotification = { id: number; title: string; body: string; date: string; read: boolean };
const INITIAL_TOPBAR_NOTIFICATIONS: MockTopbarNotification[] = [
  { id: 1, title: "ใบลาของสมชาย ใจดี รอ HR ตรวจ", body: "ลากิจ 30 ต.ค. 2569 · 1 วัน", date: "วันนี้ · 10:00", read: false },
  { id: 2, title: "ใบ OT ของวีระ ศรีสุข รอพิจารณา", body: "14 ต.ค. 2569 · 18:00–20:30 · 2.5 ชั่วโมง", date: "วันนี้ · 09:00", read: false },
  { id: 3, title: "ผู้จัดการอนุมัติใบลาของคุณแล้ว", body: "เอกสารส่งต่อให้ HR ตรวจแล้ว", date: "เมื่อวาน · 15:00", read: true },
];

function readTopbarNotifications(): MockTopbarNotification[] {
  try {
    const stored = localStorage.getItem(TOPBAR_NOTIFICATION_KEY);
    return stored ? JSON.parse(stored) as MockTopbarNotification[] : INITIAL_TOPBAR_NOTIFICATIONS;
  } catch {
    return INITIAL_TOPBAR_NOTIFICATIONS;
  }
}

// แปลงแจ้งเตือนจาก API ให้เป็นรูปแบบที่ topbar ใช้ (เหมือนหน้าจอการแจ้งเตือน)
function mapApiNotifications(rows: Awaited<ReturnType<typeof listNotifications>>): TopbarNotification[] {
  return rows.map((row) => ({
    id: `document-${row.notificationId}`,
    notificationId: row.notificationId,
    documentId: row.id,
    title: `${row.employeeName} · ${row.requestNo}`,
    body: [row.reason ?? row.otTask ?? row.place ?? '', row.kind, row.status].filter(Boolean).join(' · '),
    date: row.createdAt,
    read: row.isRead,
  }));
}

function formatNotificationDate(value: string, language: "th" | "en"): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapAnnouncementNotifications(
  rows: Awaited<ReturnType<typeof listAnnouncementNotifications>>,
  labels: Record<AnnouncementCategory, string>,
): TopbarNotification[] {
  return rows.data.map((row) => ({
    id: `announcement-${row.id}`,
    announcementId: row.id,
    title: row.title,
    body: row.summary || labels[row.category],
    date: row.publishedAt ?? "",
    read: row.isRead,
  }));
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
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountDialog, setAccountDialog] = useState<"profile" | "password" | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // โหมด DB: ใช้แจ้งเตือนจริงจาก API — ถ้าโหลดไม่ได้ fallback ไป mock เดิม
  const [dbNotifications, setDbNotifications] = useState<TopbarNotification[] | null>(null);
  const [mockNotifications, setMockNotifications] = useState(readTopbarNotifications);
  const [dbBadge, setDbBadge] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyError, setCompanyError] = useState("");
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const companyPickerRef = useRef<HTMLDivElement>(null);
  // เอฟเฟคกระดิ่ง: true เมื่อเพิ่งมีแจ้งเตือนใหม่ (กระดิ่งสั่น + วงแหวน ping) จนกว่าจะเปิด dropdown
  const [bellPing, setBellPing] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const isThai = language === "th";
  const isAdmin = user.role.name.trim().toLowerCase() === "admin";
  const topbarTranslations = translations.topbar;
  useErrorToast(companyError);
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
    if (!isAdmin) {
      try {
        setManagementCompanyId(null);
      } catch (error) {
        setCompanyError(error instanceof Error ? error.message : topbarTranslations.companySwitchError);
      }
      setCompanies([]);
      return;
    }

    let active = true;
    void listCompanies()
      .then(({ data }) => {
        if (!active) return;
        const activeCompanies = data.filter((company) => Boolean(company.isActive));
        setCompanies(activeCompanies);
        const storedCompanyId = getManagementCompanyId();
        if (storedCompanyId !== null && !activeCompanies.some((company) => company.id === storedCompanyId)) {
          setManagementCompanyId(null);
          setCompanyError(topbarTranslations.companyUnavailable);
        }
      })
      .catch((error: unknown) => {
        if (active) setCompanyError(error instanceof Error ? error.message : topbarTranslations.companyLoadError);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, topbarTranslations.companyLoadError, topbarTranslations.companyUnavailable, topbarTranslations.companySwitchError]);

  useEffect(() => {
    try { localStorage.setItem(TOPBAR_NOTIFICATION_KEY, JSON.stringify(mockNotifications)); } catch { /* mock storage is optional */ }
  }, [mockNotifications]);

  // โหลดแจ้งเตือนจริงจาก DB (ตอนเปิด dropdown และ poll ทุก 30 วินาที)
  const prevUnreadRef = useRef<number | null>(null);
  const loadDbNotifications = async () => {
    const [documentsResult, announcementsResult, badgesResult] = await Promise.allSettled([
      listNotifications(),
      listAnnouncementNotifications(),
      getBadges(),
    ])
    const documents = documentsResult.status === "fulfilled" ? mapApiNotifications(documentsResult.value) : []
    const announcementRows = announcementsResult.status === "fulfilled"
      ? mapAnnouncementNotifications(
          announcementsResult.value,
          translations.features.announcements.categories,
        )
      : []

    if (documentsResult.status === "fulfilled" || announcementsResult.status === "fulfilled") {
      setDbNotifications([...documents, ...announcementRows].sort((left, right) => (
        new Date(right.date).getTime() - new Date(left.date).getTime()
      )))
    }

    const documentUnread = badgesResult.status === "fulfilled"
      ? badgesResult.value.unreadNotifications
      : documents.filter((notification) => !notification.read).length
    const announcementUnread = announcementsResult.status === "fulfilled"
      ? announcementsResult.value.unreadCount
      : announcementRows.filter((notification) => !notification.read).length
    if (documentsResult.status === "fulfilled" || badgesResult.status === "fulfilled" || announcementsResult.status === "fulfilled") {
      const totalUnread = documentUnread + announcementUnread
      setDbBadge(totalUnread)
      // เสียงแจ้งเตือน: ดังเฉพาะเมื่อจำนวนที่ยังไม่อ่านเพิ่มขึ้น (ข้ามครั้งแรกหลังโหลดหน้า)
      const prev = prevUnreadRef.current
      if (prev !== null && totalUnread > prev) {
        playNotificationSound()
        setBellPing(true)
      }
      prevUnreadRef.current = totalUnread
    }
  };
  // Badge + dropdown แจ้งเตือน + โปรไฟล์ (Topbar): รีเฟรชเมื่อ "มีการกระทำ" เท่านั้น (ไม่ poll ตามเวลา)
  // - dms:doc-data-changed : ยื่น/อนุมัติ/ปฏิเสธ/ยกเลิก/อ่านแจ้งเตือน ฯลฯ → badge + dropdown + bell อัปเดตทันที
  // - dms:user-updated     : บันทึกข้อมูล/รูปโปรไฟล์พนักงานเสร็จ → Topbar ชื่อ+รูปใหม่ทันที (ผ่าน auth provider)
  // ปิดท้าย: กลับมาที่แท็บ/โฟกัสหน้าต่างก็รีเฟรชครั้งเดียว (ไม่รบกวนระหว่างใช้งาน)
  useEffect(() => {
    const refresh = () => { loadDbNotifications() }
    const onVisible = () => { if (!document.hidden) refresh() }
    refresh()
    window.addEventListener('dms:doc-data-changed', refresh)
    window.addEventListener('dms:announcement-data-changed', refresh)
    window.addEventListener('dms:user-updated', refresh)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('dms:doc-data-changed', refresh)
      window.removeEventListener('dms:announcement-data-changed', refresh)
      window.removeEventListener('dms:user-updated', refresh)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [language]);
  useEffect(() => { if (notificationsOpen) { setBellPing(false); loadDbNotifications(); } }, [notificationsOpen]);

  // ปิด dropdown เลือกบริษัทเมื่อคลิกนอกเมนูหรือกด Esc
  useEffect(() => {
    if (!companyPickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!companyPickerRef.current?.contains(event.target as Node)) setCompanyPickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCompanyPickerOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [companyPickerOpen]);

  // การแจ้งเตือนบน Topbar: เมื่อมี event (เอกสารใหม่/อ่านแจ้งเตือน/แก้โปรไฟล์)
  // → loadDbNotifications ด้านบนรีโหลดทั้ง badge และรายการใน dropdown (setDbNotifications)
  //   ทำให้ dropdown ที่เปิดค้างอยู่อัปเดตทันทีโดยไม่ต้องปิด-เปิดใหม่

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

  const notifications: TopbarNotification[] = dbNotifications ?? mockNotifications.map((notification) => ({
    ...notification,
    id: `mock-${notification.id}`,
    mockId: notification.id,
  }));
  const unreadCount = dbNotifications !== null ? dbBadge : (dbBadge || mockNotifications.filter((notification) => !notification.read).length);
  const markAllNotificationsRead = () => {
    if (dbNotifications !== null) {
      const pending: Promise<unknown>[] = [markNotificationsRead(), markAllAnnouncementNotificationsRead()]
      void Promise.allSettled(pending).then(() => loadDbNotifications())
      return
    }
    setMockNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };
  // คลิกแจ้งเตือน: อ่านแล้ว → เปิดหน้ารายละเอียดเอกสารหรือประกาศที่เกี่ยวข้อง
  const openNotificationsPage = (notification?: TopbarNotification) => {
    let targetPage: PageKey = "documents-notifications"
    if (notification) {
      if (notification.announcementId) {
        targetPage = "announcements"
        sessionStorage.setItem(OPEN_ANNOUNCEMENT_KEY, String(notification.announcementId))
        window.dispatchEvent(new Event("dms:open-announcement"))
        void markAnnouncementRead(notification.announcementId).then(() => {
          loadDbNotifications()
          window.dispatchEvent(new Event("dms:announcement-data-changed"))
        }).catch(() => {});
      } else if (notification.notificationId !== undefined) {
        void markNotificationsRead(notification.notificationId).then(loadDbNotifications).catch(() => {});
      } else if (notification.mockId !== undefined) {
        setMockNotifications((current) => current.map((item) => item.id === notification.mockId ? { ...item, read: true } : item));
      }
      if (notification.documentId) {
        sessionStorage.setItem(OPEN_DOCUMENT_KEY, String(notification.documentId));
        // ถ้าอยู่หน้าเอกสารอยู่แล้ว component ไม่ re-mount → ยิง event ให้เปิดรายละเอียดทันที
        window.dispatchEvent(new Event("dms:open-doc"));
      }
    }
    setNotificationsOpen(false);
    onNavigate?.(targetPage);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      setManagementCompanyId(null);
      await onLogout();
      setProfileOpen(false);
    } catch (error) {
      console.error("Unable to sign out", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const selectManagementCompany = async (companyId: number) => {
    if (companyId === user.company?.id) return;
    setCompanyError("");
    setIsSwitchingCompany(true);
    try {
      setManagementCompanyId(companyId);
      const { data } = await getCurrentUser();
      if (Number(data.company?.id) !== companyId) {
        setManagementCompanyId(null);
        setCompanyError(topbarTranslations.companySwitchNotApplied);
        return;
      }
      window.location.reload();
    } catch (error) {
      try {
        setManagementCompanyId(null);
      } catch {
        // Keep the original API error visible if session storage is unavailable.
      }
      setCompanyError(error instanceof Error ? error.message : topbarTranslations.companySwitchError);
    } finally {
      setIsSwitchingCompany(false);
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
        {/* โลโก้บนมือถือ: sidebar ซ่อนอยู่เมื่อจอ < 720px จึงแสดงโลโก้ใน topbar แทน (แสดงเฉพาะจอเล็ก) */}
        <span className="topbar-brand" aria-hidden="true">
          {user.company?.logoUrl ? <img className="brand-company-logo" src={user.company.logoUrl} alt="" /> : <span className="brand-mark boswell-logo-mark"><span /></span>}
        </span>
      </div>
      <div className="topbar-actions">
        {isAdmin && companies.length > 0 && <div className="company-picker" ref={companyPickerRef}>
          <button
            type="button"
            className={`company-picker-button ${companyPickerOpen ? "is-open" : ""}`}
            aria-label={topbarTranslations.manageCompany}
            aria-haspopup="listbox"
            aria-expanded={companyPickerOpen}
            disabled={isSwitchingCompany}
            onClick={() => setCompanyPickerOpen((open) => !open)}
          >
            <span className="company-picker-logo" aria-hidden="true">
              {user.company?.logoUrl
                ? <img src={user.company.logoUrl} alt="" />
                : <span className="company-picker-logo-fallback">{user.company?.name?.[0]?.toUpperCase() ?? "C"}</span>}
            </span>
            <span className="company-picker-copy">
              <small>{topbarTranslations.manageCompany}</small>
              <strong>{isSwitchingCompany ? (isThai ? "กำลังสลับ..." : "Switching...") : user.company?.name}</strong>
            </span>
            <span className={`company-picker-chevron ${companyPickerOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
          </button>
          {companyPickerOpen && (
            <ul className="company-picker-menu" role="listbox" aria-label={topbarTranslations.manageCompany}>
              {companies.map((company) => {
                const selected = company.id === user.company?.id;
                return (
                  <li key={company.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`company-picker-option ${selected ? "is-selected" : ""}`}
                      disabled={isSwitchingCompany || selected}
                      onClick={() => { setCompanyPickerOpen(false); void selectManagementCompany(company.id); }}
                    >
                      <span className="company-picker-logo" aria-hidden="true">
                        {company.logoUrl
                          ? <img src={company.logoUrl} alt="" />
                          : <span className="company-picker-logo-fallback">{company.name[0]?.toUpperCase() ?? "C"}</span>}
                      </span>
                      <span className="company-picker-copy"><strong>{company.name}</strong></span>
                      {selected && <span className="company-picker-check" aria-hidden="true">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>}
        <div className="notification-menu" ref={notificationsRef}>
          <button
            type="button"
            className={`icon-button notification-button ${unreadCount > 0 ? "has-unread" : ""} ${bellPing ? "is-pinging" : ""}`}
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
            <div className="topbar-notification-list">{notifications.length === 0 ? <p className="topbar-notification-empty">{isThai ? "ไม่มีการแจ้งเตือน" : "No notifications"}</p> : notifications.map((notification) => <button type="button" key={notification.id} className={`topbar-notification ${notification.read ? "" : "is-unread"}`} onClick={() => openNotificationsPage(notification)}><span className="topbar-notification-mark" aria-hidden="true" /><span className="topbar-notification-copy"><strong>{notification.title}</strong><small>{notification.body}</small><time>{formatNotificationDate(notification.date, language)}</time></span></button>)}</div>
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
            <span className="avatar">{avatarSrc(user.avatarUrl) ? <img src={avatarSrc(user.avatarUrl)!} alt={user.name} /> : initials}</span>
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
                className="profile-action"
                onClick={() => { setProfileOpen(false); setAccountDialog("profile"); }}
                role="menuitem"
              >
                <FaUserPen aria-hidden="true" />
                {topbarTranslations.editProfile}
              </button>
              <button
                type="button"
                className="profile-action"
                onClick={() => { setProfileOpen(false); setAccountDialog("password"); }}
                role="menuitem"
              >
                <FaLock aria-hidden="true" />
                {topbarTranslations.changePassword}
              </button>
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
      {accountDialog && (
        <AccountDialog
          mode={accountDialog}
          user={user}
          translations={topbarTranslations}
          onClose={() => setAccountDialog(null)}
        />
      )}
    </header>
  );
}
