import { FaXmark } from "react-icons/fa6";
import type { CommonTranslations, ProjectTranslations, ProjectItem } from "../page";
import { getInitials } from "../page";

export function ProjectSidePanel({
  projectTranslations,
  commonTranslations,
  project,
  onClose,
  onOpen,
}: {
  projectTranslations: ProjectTranslations;
  commonTranslations: CommonTranslations;
  project: ProjectItem;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const collaborators = [
    { name: project.projectManagerName, role: projectTranslations.detail.managerRole },
    { name: project.customerName, role: projectTranslations.detail.customerRole },
    ...project.operatorNames.map((name) => ({ name, role: projectTranslations.detail.operatorRole })),
  ].filter((person) => person.name && person.name !== "—");
  const metadata = [
    [projectTranslations.detail.size, project.size],
    [projectTranslations.detail.created, project.createdAt],
    [projectTranslations.detail.createdBy, project.uploadedBy],
    [commonTranslations.labels.lastModified, project.updatedAt],
    [projectTranslations.detail.updatedBy, project.lastModifiedBy],
  ];
  return (
    <aside className="dms-col-side">
      <div className="dms-side-head">
        <h3>{projectTranslations.detail.details}</h3>
        <button type="button" className="dms-side-close" onClick={onClose}>
          <FaXmark />
        </button>
      </div>
      <div className="dms-preview-wrap">
        <button
          type="button"
          className="dms-preview-open"
          onClick={() => onOpen(project.encryptedId)}
        >
          {projectTranslations.detail.open}
        </button>
      </div>
      <div className="dms-side-title-row">
        <h2 className="dms-side-name">{project.name}</h2>
        <span className={`dms-card-status is-${project.status}`}>
          {project.statusLabel}
        </span>
      </div>
      <div className="dms-meta-list">
        {metadata.map(([label, value]) => (
          <div key={label} className="dms-meta-row">
            <span className="dms-meta-label">{label}</span>
            <span className="dms-meta-value">{value}</span>
          </div>
        ))}
      </div>
      <div className="dms-section-head">
        <h4>{projectTranslations.detail.contributors}</h4>
      </div>
      <div className="dms-people-list">
        {collaborators.length ? (
          collaborators.map((person) => (
            <div
              key={`${person.name}-${person.role}`}
              className="dms-person-row"
            >
              <div className="dms-person-info">
                <div className="dms-avatar">{getInitials(person.name)}</div>
                <div className="dms-person-text">
                  <span className="dms-person-name">{person.name}</span>
                </div>
              </div>
              <span className="dms-role-pill">{person.role}</span>
            </div>
          ))
        ) : (
          <div className="dms-person-row">
            <span className="dms-person-email">—</span>
          </div>
        )}
      </div>
    </aside>
  );
}
