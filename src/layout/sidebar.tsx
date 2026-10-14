import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
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
import { useAuth } from "../features/auth/hooks/use-auth";
import { canViewModule } from "../features/auth/permissions";
import type { Translations } from "../locales";
import type { PageKey } from '../services/routes/pageTypes'
import {FaFolderOpen,} from "react-icons/fa6";

const icons = {
  dashboard: FaTableCellsLarge,
  projects: FaFileLines,
  documents: FaFolderOpen,
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
  | "projects"
  | "projects-cm"
  | "documents"
  | "documents-all"
  | "documents-pending"
  | "documents-ledger"
  | "documents-employees"
  | "documents-policy"
  | "documents-notifications"
  | "report"
  | "trash"
  | "settings-user"
  | "settings-roles"
  | "settings-departments"
  | "settings-permissions"
  | "settings-modules"
  | "settings-companies"
  | "settings-activity";

const sidebarModuleKeys = new Set<SidebarItem>([
  "settings-roles",
  "settings-departments",
  "settings-permissions",
  "settings-modules",
  "settings-companies",
]);



export default function Sidebar({
  translations,
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggle,
  activeItem = "projects",
  onNavigate,
}: {
  translations: Translations;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  activeItem?: PageKey;
  onNavigate?: (item: PageKey) => void;
}) {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [accessOpen, setAccessOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const sidebarTranslations = translations.sidebar;
  const documentNavTranslations = sidebarTranslations.items.documentViews;
  const companyName = user?.company?.name || "Boswell";
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [collapsedFlyout, setCollapsedFlyout] = useState<"projects" | "documents" | "settings" | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(8);
  const projectsToggleRef = useRef<HTMLButtonElement>(null);
  const documentsToggleRef = useRef<HTMLButtonElement>(null);
  const settingsToggleRef = useRef<HTMLButtonElement>(null);
  const previousActiveItem = useRef(activeItem);

  const toggleSidebarGroup = (
    group: "projects" | "documents" | "settings",
    isOpen: boolean,
    setOpen: (value: boolean | ((current: boolean) => boolean)) => void,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (!collapsed) {
      setOpen((open) => !open);
      return;
    }
    if (collapsedFlyout === group && isOpen) {
      setOpen(false);
      setCollapsedFlyout(null);
      return;
    }
    const anchorTop = event.currentTarget.getBoundingClientRect().top;
    setFlyoutTop(Math.max(8, Math.min(anchorTop, window.innerHeight - 300)));
    setCollapsedFlyout(group);
    setOpen(true);
  };

  const flyoutStyle = { "--sidebar-flyout-top": `${flyoutTop}px` } as CSSProperties;

  useEffect(() => {
    if (previousActiveItem.current === activeItem) return;
    previousActiveItem.current = activeItem;
    const group = ["projects", "projects-cm", "survey"].includes(activeItem)
      ? "projects"
      : activeItem.startsWith("documents")
        ? "documents"
        : activeItem.startsWith("settings-")
          ? "settings"
          : null;
    setProjectsOpen(group === "projects");
    setDocumentsOpen(group === "documents");
    setSettingsOpen(group === "settings");
    setCollapsedFlyout(group);
    if (group && collapsed) {
      const anchor = group === "projects" ? projectsToggleRef.current : group === "documents" ? documentsToggleRef.current : settingsToggleRef.current;
      if (anchor) setFlyoutTop(Math.max(8, Math.min(anchor.getBoundingClientRect().top, window.innerHeight - 300)));
    }
  }, [activeItem, collapsed]);

  const grantedModules = [...new Map(
    (user?.permissions ?? []).map((permission) => [permission.module, {
      name: permission.module,
      iconName: permission.moduleIconName,
      sortOrder: permission.moduleSortOrder,
    }]),
  ).values()];

  const moduleItems: Array<{ key: SidebarItem; label: string; icon?: IconType }> = grantedModules
    .filter((module) => Boolean(user && canViewModule(user, module.name)))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((module) => {
      const mainKey = module.name === "reports" ? "report" : module.name;
      const key = ["dashboard", "projects", "documents", "report", "trash"].includes(mainKey)
        ? mainKey as SidebarItem
        : `settings-${module.name}` as SidebarItem;
      const localizedLabel = sidebarTranslations.items?.[module.name as keyof typeof sidebarTranslations.items]
        ?? sidebarTranslations[module.name as keyof typeof sidebarTranslations];
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
    ["dashboard", "projects", "documents", "report", "trash"].includes(item.key),
  );
  const accessItems = moduleItems.filter((item) => sidebarModuleKeys.has(item.key));
  const companiesIndex = accessItems.findIndex((item) => item.key === "settings-companies");
  const modulesIndex = accessItems.findIndex((item) => item.key === "settings-modules");
  if (companiesIndex !== -1 && modulesIndex !== -1 && companiesIndex !== modulesIndex + 1) {
    const [companiesItem] = accessItems.splice(companiesIndex, 1);
    accessItems.splice(accessItems.findIndex((item) => item.key === "settings-modules") + 1, 0, companiesItem);
  }
  const canViewUsers = Boolean(user && canViewModule(user, "users"));
  const canViewActivity = Boolean(user && canViewModule(user, "activity_logs"));
  const hasSettingsItems = canViewUsers || accessItems.length > 0 || canViewActivity;
  const hasActiveSettingsItem = activeItem.startsWith("settings-");
  const hasActiveAccessItem = accessItems.some((item) => item.key === activeItem);

  return (
    <>
      <button
        className={`sidebar-backdrop ${mobileOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-label={sidebarTranslations.closeNav}
      />
      <aside
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="brand-row">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() => onNavigate?.("dashboard")}
            title={collapsed ? companyName : undefined}
            aria-label={`${companyName} - Dashboard`}
          >
            {user?.company?.logoUrl ? <img className="brand-company-logo" src={user.company.logoUrl} alt="" /> : <span className="brand-mark boswell-logo-mark"><span /></span>}
            <span className="brand-copy">
              <strong>{companyName}</strong>
              <small>{sidebarTranslations.brand}</small>
            </span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? sidebarTranslations.expand : sidebarTranslations.collapse}
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
            aria-label={sidebarTranslations.close}
          >
            ×
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={sidebarTranslations.navigation}>
          {mainItems.map((item) => {
            if (item.key === 'projects') {
              return (
                <div className="nav-group" key={item.key}>
                  <button
                    ref={projectsToggleRef}
                    className={`nav-item nav-button projects-toggle ${['projects', 'projects-cm', 'survey'].includes(activeItem) ? 'has-active-child' : ''}`}
                    onClick={(event) => toggleSidebarGroup("projects", projectsOpen, setProjectsOpen, event)}
                    title={collapsed ? item.label : undefined}
                    aria-expanded={projectsOpen}
                  >
                    {item.icon && <item.icon className="nav-icon" size={17} aria-hidden="true" />}
                    <span>{item.label}</span>
                    <i className={projectsOpen ? 'is-rotated' : ''}>⌄</i>
                  </button>
                  {projectsOpen && (!collapsed || collapsedFlyout === "projects") && (
                    <div className="subnav" style={flyoutStyle}>
                      <strong className="subnav-title">{item.label}</strong>
                      <button
                        className={`nav-item nav-button ${activeItem === 'projects' ? 'is-active' : ''}`}
                        onClick={() => onNavigate?.('projects')}
                      >
                        <span>PM</span>
                      </button>
                      <button
                        className={`nav-item nav-button ${activeItem === 'projects-cm' ? 'is-active' : ''}`}
                        onClick={() => onNavigate?.('projects-cm')}
                      >
                        <span>CM</span>
                      </button>
                      <button
                        className={`nav-item nav-button ${activeItem === 'survey' ? 'is-active' : ''}`}
                        onClick={() => onNavigate?.('survey')}
                      >
                        <span>Survey</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

if (item.key === "documents") {
  const documentItems: Array<{
    key: PageKey;
    label: string;
  }> = [
    { key: "documents-all", label: documentNavTranslations.all },
    { key: "documents-pending", label: documentNavTranslations.pending },
    { key: "documents-ledger", label: documentNavTranslations.ledger },
    { key: "documents-employees", label: documentNavTranslations.employees },
    { key: "documents-policy", label: documentNavTranslations.policy },
    { key: "documents-notifications", label: documentNavTranslations.notifications },
  ];

  return (
    <div
      className="nav-group"
      key={item.key}
    >
      <button
        type="button"
        ref={documentsToggleRef}
        className={`nav-item nav-button documents-toggle ${
          activeItem.startsWith("documents")
            ? "has-active-child"
            : ""
        }`}
        onClick={(event) => toggleSidebarGroup("documents", documentsOpen, setDocumentsOpen, event)}
        title={collapsed ? item.label : undefined}
        aria-expanded={documentsOpen}
      >
        {item.icon && (
          <item.icon
            className="nav-icon"
            size={17}
            aria-hidden="true"
          />
        )}
        <span>{sidebarTranslations.items.documents}</span>
        <i className={documentsOpen ? "is-rotated" : ""}>⌄</i>
      </button>

      {documentsOpen && (!collapsed || collapsedFlyout === "documents") && (
        <div className="subnav" style={flyoutStyle}>
          {documentItems.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              className={`nav-item nav-button ${
                activeItem === key ? "is-active" : ""
              }`}
              onClick={() => onNavigate?.(key)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
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
                {item.key === ("projects" as SidebarItem) && <b className="item-count">11</b>}
              </button>
            );
          })}
          {hasSettingsItems && <div className="nav-divider" />}
          {hasSettingsItems && <div className="settings-group">
            <button
              ref={settingsToggleRef}
              className={`nav-item nav-button settings-toggle ${hasActiveSettingsItem ? "has-active-child" : ""}`}
              onClick={(event) => toggleSidebarGroup("settings", settingsOpen, setSettingsOpen, event)}
              title={collapsed ? sidebarTranslations.settingsHint : undefined}
              aria-expanded={settingsOpen}
            >
              <Icon name="settings" />
              <span>{sidebarTranslations.settings}</span>
              <i className={settingsOpen ? "is-rotated" : ""}>⌄</i>
            </button>
            {settingsOpen && (!collapsed || collapsedFlyout === "settings") && (
              <div className="subnav" style={flyoutStyle}>
                <strong className="subnav-title">{sidebarTranslations.settings}</strong>
                {canViewUsers && <button
                  className={`nav-item nav-button ${activeItem === "settings-user" ? "is-active" : ""}`}
                  onClick={() => onNavigate?.("settings-user")}
                >
                  <Icon name="user" />
                  <span>{sidebarTranslations.user}</span>
                </button>}
                {accessItems.length > 0 && <button
                  className={`nav-item nav-button access-toggle ${hasActiveAccessItem ? "has-active-child" : ""}`}
                  type="button"
                  aria-expanded={accessOpen}
                  onClick={() => setAccessOpen((open) => !open)}
                >
                  <Icon name="settings" />
                  <span>{sidebarTranslations.access}</span>
                  <i className={accessOpen ? "is-rotated" : ""}>⌄</i>
                </button>}
                {accessItems.length > 0 && accessOpen && (
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
                {canViewActivity && <button
                  className={`nav-item nav-button ${activeItem === "settings-activity" ? "is-active" : ""}`}
                  onClick={() => onNavigate?.("settings-activity")}
                >
                  <Icon name="activity" />
                  <span>{sidebarTranslations.activity}</span>
                </button>}
              </div>
            )}
          </div>}
        </nav>
      </aside>
    </>
  );
}
