import { useEffect, useRef } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { FaEllipsis, FaFileLines, FaPen, FaTrashCan } from "react-icons/fa6";
import type { CommonTranslations, ProjectTranslations, ProjectItem } from "../page";

function ProjectMenu({
  projectTranslations,
  commonTranslations,
  project,
  onEdit,
  onDelete,
}: {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
  project: ProjectItem;
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
}) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>
        <button
          type="button"
          className="dms-card-menu"
          aria-label={projectTranslations.manageProject.replace("{name}", project.name)}
          onClick={(event) => event.stopPropagation()}
        >
          <FaEllipsis />
        </button>
      </RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          className="dms-card-menu-content"
          sideOffset={6}
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <RadixMenu.Item
            className="dms-card-menu-item"
            onSelect={() => onEdit(project)}
          >
            <FaPen />
            {commonTranslations.actions.edit}
          </RadixMenu.Item>
          <RadixMenu.Item
            className="dms-card-menu-item is-danger"
            onSelect={() => onDelete(project)}
          >
            <FaTrashCan />
            {commonTranslations.actions.delete}
          </RadixMenu.Item>
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export function ProjectList({
  projectTranslations,
  commonTranslations,
  projects,
  viewMode,
  selectedId,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
  projects: ProjectItem[];
  viewMode: "grid" | "list";
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
}) {
  const singleClickTimer = useRef<number | null>(null);
  const lastTouch = useRef<{ projectId: string; time: number } | null>(null);
  useEffect(
    () => () => {
      if (singleClickTimer.current !== null)
        window.clearTimeout(singleClickTimer.current);
    },
    [],
  );

  const selectLater = (id: string) => {
    if (singleClickTimer.current !== null)
      window.clearTimeout(singleClickTimer.current);
    singleClickTimer.current = window.setTimeout(() => {
      onSelect(id);
      singleClickTimer.current = null;
    }, 220);
  };
  const openNow = (id: string) => {
    if (singleClickTimer.current !== null)
      window.clearTimeout(singleClickTimer.current);
    singleClickTimer.current = null;
    onOpen(id);
  };
  const touchOpen = (id: string, pointerType: string) => {
    if (pointerType !== "touch" && pointerType !== "pen") return;
    const now = Date.now();
    if (
      lastTouch.current?.projectId === id &&
      now - lastTouch.current.time <= 350
    ) {
      lastTouch.current = null;
      openNow(id);
    } else lastTouch.current = { projectId: id, time: now };
  };
  const interactionProps = (id: string) => ({
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.target as Node)) selectLater(id);
    },
    onDoubleClick: (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      openNow(id);
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!(event.target as Element).closest("button"))
        touchOpen(id, event.pointerType);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && event.key === "Enter")
        openNow(id);
    },
    tabIndex: 0,
  });

  if (viewMode === "grid")
    return (
      <div className="dms-card-grid">
        {projects.map((project) => (
          <article
            key={project.encryptedId}
            className={`dms-project-card ${selectedId === project.encryptedId ? "is-selected" : ""}`}
            role="button"
            {...interactionProps(project.encryptedId)}
          >
            <div className="dms-card-head">
              <div className="dms-project-icon-pill">
                <FaFileLines />
              </div>
              <div className="dms-project-actions">
                <span className={`dms-card-status is-${project.status}`}>
                  {project.statusLabel}
                </span>
                <ProjectMenu
                  projectTranslations={projectTranslations}
                  commonTranslations={commonTranslations}
                  project={project}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>
            <h3 className="dms-card-name">{project.name}</h3>
            <div className="dms-card-foot">
              <div className="dms-card-owner">
                <div className="dms-avatar">{project.ownerInitials}</div>
                <span className="dms-owner-name">{project.ownerName}</span>
              </div>
              <div className="dms-card-meta">
                <span className="dms-card-size">{project.size}</span>
                <span className="dms-card-date">{project.updatedAt}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );

  return (
    <div className="dms-project-table-wrap">
      <table className="dms-project-table">
        <thead>
          <tr>
            <th scope="col">{projectTranslations.nameColumn}</th>
            <th scope="col">{projectTranslations.ownerColumn}</th>
            <th scope="col">{projectTranslations.sizeColumn}</th>
            <th scope="col">{commonTranslations.labels.lastModified}</th>
            <th scope="col">{commonTranslations.labels.status}</th>
            <th scope="col" aria-label={projectTranslations.manageColumn} />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.encryptedId}
              className={selectedId === project.encryptedId ? "is-selected" : ""}
              {...interactionProps(project.encryptedId)}
            >
              <td>
                <div className="dms-table-document">
                  <span className="dms-project-icon-pill">
                    <FaFileLines />
                  </span>
                  <span>{project.name}</span>
                </div>
              </td>
              <td>
                <div className="dms-card-owner">
                  <span className="dms-avatar">{project.ownerInitials}</span>
                  <span className="dms-owner-name">{project.ownerName}</span>
                </div>
              </td>
              <td className="dms-table-nowrap">{project.size}</td>
              <td className="dms-table-nowrap">{project.updatedAt}</td>
              <td>
                <span className={`dms-card-status is-${project.status}`}>
                  {project.statusLabel}
                </span>
              </td>
              <td className="dms-table-menu-cell">
                <ProjectMenu
                  projectTranslations={projectTranslations}
                  commonTranslations={commonTranslations}
                  project={project}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
