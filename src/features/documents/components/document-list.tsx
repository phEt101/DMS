import { useEffect, useRef } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { FaEllipsis, FaFileLines, FaPen, FaTrashCan } from "react-icons/fa6";
import type { DocItem } from "../page";

function DocumentMenu({
  document,
  onEdit,
  onDelete,
}: {
  document: DocItem;
  onEdit: (document: DocItem) => void;
  onDelete: (document: DocItem) => void;
}) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>
        <button
          type="button"
          className="dms-card-menu"
          aria-label={`จัดการ ${document.name}`}
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
            onSelect={() => onEdit(document)}
          >
            <FaPen />
            แก้ไข
          </RadixMenu.Item>
          <RadixMenu.Item
            className="dms-card-menu-item is-danger"
            onSelect={() => onDelete(document)}
          >
            <FaTrashCan />
            ลบ
          </RadixMenu.Item>
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export function DocumentList({
  documents,
  viewMode,
  selectedId,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: {
  documents: DocItem[];
  viewMode: "grid" | "list";
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onEdit: (document: DocItem) => void;
  onDelete: (document: DocItem) => void;
}) {
  const singleClickTimer = useRef<number | null>(null);
  const lastTouch = useRef<{ documentId: number; time: number } | null>(null);
  useEffect(
    () => () => {
      if (singleClickTimer.current !== null)
        window.clearTimeout(singleClickTimer.current);
    },
    [],
  );

  const selectLater = (id: number) => {
    if (singleClickTimer.current !== null)
      window.clearTimeout(singleClickTimer.current);
    singleClickTimer.current = window.setTimeout(() => {
      onSelect(id);
      singleClickTimer.current = null;
    }, 220);
  };
  const openNow = (id: number) => {
    if (singleClickTimer.current !== null)
      window.clearTimeout(singleClickTimer.current);
    singleClickTimer.current = null;
    onOpen(id);
  };
  const touchOpen = (id: number, pointerType: string) => {
    if (pointerType !== "touch" && pointerType !== "pen") return;
    const now = Date.now();
    if (
      lastTouch.current?.documentId === id &&
      now - lastTouch.current.time <= 350
    ) {
      lastTouch.current = null;
      openNow(id);
    } else lastTouch.current = { documentId: id, time: now };
  };
  const interactionProps = (id: number) => ({
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
        {documents.map((document) => (
          <article
            key={document.id}
            className={`dms-doc-card ${selectedId === document.id ? "is-selected" : ""}`}
            role="button"
            {...interactionProps(document.id)}
          >
            <div className="dms-card-head">
              <div className="dms-doc-icon-pill">
                <FaFileLines />
              </div>
              <div className="dms-document-actions">
                <span className={`dms-card-status is-${document.status}`}>
                  {document.statusLabel}
                </span>
                <DocumentMenu
                  document={document}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>
            <h3 className="dms-card-name">{document.name}</h3>
            <div className="dms-card-foot">
              <div className="dms-card-owner">
                <div className="dms-avatar">{document.ownerInitials}</div>
                <span className="dms-owner-name">{document.ownerName}</span>
              </div>
              <div className="dms-card-meta">
                <span className="dms-card-size">{document.size}</span>
                <span className="dms-card-date">{document.updatedAt}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );

  return (
    <div className="dms-doc-table-wrap">
      <table className="dms-doc-table">
        <thead>
          <tr>
            <th scope="col">ชื่อเอกสาร</th>
            <th scope="col">ผู้รับผิดชอบ</th>
            <th scope="col">ขนาด</th>
            <th scope="col">แก้ไขล่าสุด</th>
            <th scope="col">สถานะ</th>
            <th scope="col" aria-label="จัดการ" />
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr
              key={document.id}
              className={selectedId === document.id ? "is-selected" : ""}
              {...interactionProps(document.id)}
            >
              <td>
                <div className="dms-table-document">
                  <span className="dms-doc-icon-pill">
                    <FaFileLines />
                  </span>
                  <span>{document.name}</span>
                </div>
              </td>
              <td>
                <div className="dms-card-owner">
                  <span className="dms-avatar">{document.ownerInitials}</span>
                  <span className="dms-owner-name">{document.ownerName}</span>
                </div>
              </td>
              <td className="dms-table-nowrap">{document.size}</td>
              <td className="dms-table-nowrap">{document.updatedAt}</td>
              <td>
                <span className={`dms-card-status is-${document.status}`}>
                  {document.statusLabel}
                </span>
              </td>
              <td className="dms-table-menu-cell">
                <DocumentMenu
                  document={document}
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
