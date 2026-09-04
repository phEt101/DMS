import { useEffect, useRef, useState } from "react";
import {
  FaBuilding,
  FaChartColumn,
  FaFileLines,
  FaGear,
  FaKey,
  FaShieldHalved,
  FaTableCellsLarge,
  FaTrashCan,
  FaUser,
  FaWaveSquare,
} from "react-icons/fa6";
import * as FaIcons from "react-icons/fa6";
import type { IconType } from "react-icons";
import { getLocale } from "../locales";
import {
  listPermissionModules,
  permissionModulesChangedEvent,
  type PermissionModule,
} from "../features/settings/access/modules/services/modules.service";

const icons = {
  dashboard: FaTableCellsLarge,
  documents: FaFileLines,
  report: FaChartColumn,
  trash: FaTrashCan,
  settings: FaGear,
  user: FaUser,
  activity: FaWaveSquare,
};

function Icon({ name }: { name: keyof typeof icons }) {
  const IconComponent = icons[name];
  return <IconComponent className="nav-icon" size={17} aria-hidden="true" />;
}

type SidebarItem =
  | "dashboard"
  | "documents"
  | "report"
  | "trash"
  | "settings-user"
  | "settings-roles"
  | "settings-departments"
  | "settings-permissions"
  | "settings-modules"
  | "settings-activity";

const sidebarModuleKeys = new Set<SidebarItem>([
  "settings-roles",
  "settings-departments",
  "settings-permissions",
  "settings-modules",
]);

export default function Sidebar({
  language = "th",
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggle,
  activeItem = "documents",
  onNavigate,
}: {
  language?: "th" | "en";
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  activeItem?: SidebarItem;
  onNavigate?: (item: SidebarItem) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [accessOpen, setAccessOpen] = useState(true);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const settingsGroupRef = useRef<HTMLDivElement>(null);
  const t = getLocale(language).sidebar;

  useEffect(() => {
    let active = true;

    const loadModules = () => listPermissionModules()
      .then((response) => {
        if (active) setPermissionModules(response.data);
      })
      .catch(() => {
        if (active) setPermissionModules([]);
      });

    void loadModules();
    window.addEventListener(permissionModulesChangedEvent, loadModules);

    return () => {
      active = false;
      window.removeEventListener(permissionModulesChangedEvent, loadModules);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsGroupRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const moduleItems = permissionModules
    .filter((module) => Boolean(module.isActive))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((module) => {
      const mainKey = module.name === "reports" ? "report" : module.name;
      const key = ["dashboard", "documents", "report", "trash"].includes(mainKey)
        ? mainKey as SidebarItem
        : `settings-${module.name}` as SidebarItem;
      const localizedLabel = t[module.name as keyof typeof t];
      const IconComponent = module.iconName
        ? FaIcons[module.iconName as keyof typeof FaIcons] as IconType | undefined
        : undefined;
      return {
        key,
        label: typeof localizedLabel === "string" ? localizedLabel : module.name,
        icon: IconComponent,
      };
    });

  const mainItems = moduleItems.filter((item) =>
    ["dashboard", "documents", "report", "trash"].includes(item.key),
  );
  const accessItems = moduleItems.filter((item) => sidebarModuleKeys.has(item.key));

  return (
    <>
      <button
        className={`sidebar-backdrop ${mobileOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-label={t.closeNav}
      />
      <aside
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="brand-row">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() => onNavigate?.("dashboard")}
            title={collapsed ? "Boswell" : undefined}
            aria-label="Boswell - Dashboard"
          >
            <span className="brand-mark boswell-logo-mark">
              <span />
            </span>
            <span className="brand-copy">
              <strong>Boswell</strong>
              <small>{t.brand}</small>
            </span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? t.expand : t.collapse}
          >
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
              <path d={collapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
            </svg>
          </button>
          <button
            className="mobile-close"
            onClick={onClose}
            aria-label={t.close}
          >
            ×
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={t.navigation}>
          {mainItems.map((item) => {
            return (
              <button
                className={`nav-item nav-button ${activeItem === item.key ? "is-active" : ""}`}
                key={item.key}
                title={collapsed ? item.label : undefined}
                onClick={() => onNavigate?.(item.key)}
              >
                {item.icon && (
                  <item.icon className="nav-icon" size={17} aria-hidden="true" />
                )}
                <span>{item.label}</span>
                {item.key === "documents" && <b className="item-count">11</b>}
              </button>
            );
          })}
          <div className="nav-divider" />
          <div className="settings-group" ref={settingsGroupRef}>
            <button
              className="nav-item nav-button settings-toggle"
              onClick={() => setSettingsOpen((open) => !open)}
              title={collapsed ? t.settingsHint : undefined}
              aria-expanded={settingsOpen}
            >
              <Icon name="settings" />
              <span>{t.settings}</span>
              <i className={settingsOpen ? "is-rotated" : ""}>⌄</i>
            </button>
            {settingsOpen && (
              <div className="subnav">
                <strong className="subnav-title">{t.settings}</strong>
                <button
                  className={`nav-item nav-button ${activeItem === "settings-user" ? "is-active" : ""}`}
                  onClick={() => onNavigate?.("settings-user")}
                >
                  <Icon name="user" />
                  <span>{t.user}</span>
                </button>
                <button
                  className="nav-item nav-button access-toggle"
                  type="button"
                  aria-expanded={accessOpen}
                  onClick={() => setAccessOpen((open) => !open)}
                >
                  <Icon name="settings" />
                  <span>{t.access}</span>
                  <i className={accessOpen ? "is-rotated" : ""}>⌄</i>
                </button>
                {accessOpen && (
                  <div className="access-subnav">
                    {accessItems.map(({ key, label, icon: IconComponent }) => (
                      <button
                        key={key}
                        className={"nav-item nav-button " + (activeItem === key ? "is-active" : "")}
                        onClick={() => onNavigate?.(key)}
                      >
                        {IconComponent && (
                          <IconComponent className="nav-icon" size={17} aria-hidden="true" />
                        )}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={`nav-item nav-button ${activeItem === "settings-activity" ? "is-active" : ""}`}
                  onClick={() => onNavigate?.("settings-activity")}
                >
                  <Icon name="activity" />
                  <span>{t.activity}</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
