import { FaXmark } from "react-icons/fa6";
import type { DocItem } from "../page";
import { getInitials } from "../page";

export function DocumentSidePanel({
  document,
  onClose,
  onOpen,
}: {
  document: DocItem;
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const collaborators = [
    { name: document.projectManagerName, role: "ผู้จัดการโครงการ" },
    { name: document.customerName, role: "ลูกค้า" },
    ...document.operatorNames.map((name) => ({ name, role: "ผู้ดำเนินการ" })),
  ].filter((person) => person.name && person.name !== "—");
  const metadata = [
    ["Size", document.size],
    ["Created", document.createdAt],
    ["Created By", document.uploadedBy],
    ["Last Modified", document.updatedAt],
    ["Updated By", document.lastModifiedBy],
  ];
  return (
    <aside className="dms-col-side">
      <div className="dms-side-head">
        <h3>DOCUMENT DETAILS</h3>
        <button type="button" className="dms-side-close" onClick={onClose}>
          <FaXmark />
        </button>
      </div>
      <div className="dms-preview-wrap">
        <button
          type="button"
          className="dms-preview-open"
          onClick={() => onOpen(document.id)}
        >
          Open
        </button>
      </div>
      <div className="dms-side-title-row">
        <h2 className="dms-side-name">{document.name}</h2>
        <span className={`dms-card-status is-${document.status}`}>
          {document.statusLabel}
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
        <h4>ผู้มีส่วนร่วม</h4>
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
