import { useRef } from 'react'
import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import { FaEllipsis, FaPen, FaTrashCan } from 'react-icons/fa6'
import type { CmProject } from '../mockData'

function CmMenu({ project, onEdit, onDelete }: { project: CmProject; onEdit: (p: CmProject) => void; onDelete: (p: CmProject) => void }) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>
        <button type="button" className="dms-card-menu" aria-label={`จัดการ ${project.name}`}> <FaEllipsis /> </button>
      </RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content className="dms-card-menu-content" sideOffset={6} align="end">
          <RadixMenu.Item className="dms-card-menu-item" onSelect={() => onEdit(project)}><FaPen /> แก้ไข</RadixMenu.Item>
          <RadixMenu.Item className="dms-card-menu-item is-danger" onSelect={() => onDelete(project)}><FaTrashCan /> ลบ</RadixMenu.Item>
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  )
}

export function CmList({ projects, onOpen, onEdit, onDelete }: { projects: CmProject[]; onOpen: (id: string) => void; onEdit: (p: CmProject) => void; onDelete: (p: CmProject) => void }) {
  const singleClickTimer = useRef<number | null>(null)
  const selectLater = (id: string) => {
    if (singleClickTimer.current !== null) window.clearTimeout(singleClickTimer.current)
    singleClickTimer.current = window.setTimeout(() => { onOpen(id); singleClickTimer.current = null }, 200)
  }

  return (
    <div className="dms-project-table-wrap">
      <table className="dms-project-table">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อโครงการ</th>
            <th>ลูกค้า/ไซต์</th>
            <th>ปัญหา</th>
            <th>ความสำคัญ</th>
            <th>สถานะ</th>
            <th>ผู้รับผิดชอบ</th>
            <th>สิ้นสุด (แผน)</th>
            <th>ค่าใช้จ่าย</th>
            <th aria-label="จัดการ" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} tabIndex={0} onClick={() => selectLater(p.id)} onDoubleClick={() => onOpen(p.id)}>
              <td>{p.code}</td>
              <td>{p.name}</td>
              <td>{p.customer}</td>
              <td className="dms-table-truncate">{p.problem}</td>
              <td>{p.priority}</td>
              <td>{p.status}</td>
              <td>{p.responsible}</td>
              <td className="dms-table-nowrap">{p.plannedEnd ?? '—'}</td>
              <td className="dms-table-nowrap">{p.estimatedCost ? `${p.estimatedCost} ฿` : '—'}</td>
              <td className="dms-table-menu-cell"><CmMenu project={p} onEdit={onEdit} onDelete={onDelete} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
