import * as RadixDialog from '@radix-ui/react-dialog'
import { useState, useEffect } from 'react'
import type { CmProject } from '../mockData'

export function CmFormModal({
  open,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  editing: CmProject | null
  onOpenChange: (open: boolean) => void
  onSaved: (project: CmProject) => void
}) {
  const [form, setForm] = useState<Partial<CmProject>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({})
    setErrors({})
  }, [editing, open])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name || !form.name.trim()) e.name = 'กรุณากรอกชื่อโครงการ'
    if (!form.code || !form.code.trim()) e.code = 'กรุณากรอกรหัสโครงการ'
    if (!form.customer || !form.customer.trim()) e.customer = 'กรุณากรอกลูกค้า/ไซต์'
    if (!form.problem || !form.problem.trim()) e.problem = 'กรุณากรอกรายละเอียดปัญหา'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!validate()) return
    const now = new Date().toISOString()
    const project: CmProject = {
      id: editing?.id ?? `cm-${Date.now()}`,
      code: String(form.code).trim(),
      name: String(form.name).trim(),
      customer: String(form.customer).trim(),
      problem: String(form.problem).trim(),
      objective: form.objective ?? '',
      priority: (form.priority as any) ?? 'medium',
      problemType: form.problemType ?? '',
      status: (form.status as any) ?? 'reported',
      requestedDate: form.requestedDate ?? '',
      plannedStart: form.plannedStart ?? '',
      plannedEnd: form.plannedEnd ?? '',
      responsible: form.responsible ?? '',
      location: form.location ?? '',
      estimatedCost: form.estimatedCost ?? 0,
      notes: form.notes ?? '',
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    }
    onSaved(project)
    onOpenChange(false)
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="modal-backdrop" />
        <RadixDialog.Content className="dms-modal dms-create-doc-modal">
          <RadixDialog.Title className="dms-modal-title">{editing ? 'แก้ไขโครงการ CM' : 'สร้างโครงการ CM'}</RadixDialog.Title>
          <RadixDialog.Description className="dms-modal-subtitle">กรอกข้อมูลโครงการ CM</RadixDialog.Description>
          <div className="dms-create-doc-body">
            <form className="dms-pm-create-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="dms-pm-create-grid">
                <label className="dms-form-field">
                  <span className="dms-form-label">ชื่อโครงการ <span className="dms-form-required">*</span></span>
                  <input className="dms-form-input" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  {errors.name && <div className="dms-form-error">{errors.name}</div>}
                </label>

                <label className="dms-form-field">
                  <span className="dms-form-label">รหัสโครงการ <span className="dms-form-required">*</span></span>
                  <input className="dms-form-input" value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
                  {errors.code && <div className="dms-form-error">{errors.code}</div>}
                </label>

                <label className="dms-form-field">
                  <span className="dms-form-label">ลูกค้า / สถานที่ <span className="dms-form-required">*</span></span>
                  <input className="dms-form-input" value={form.customer ?? ''} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} />
                  {errors.customer && <div className="dms-form-error">{errors.customer}</div>}
                </label>

                <label className="dms-form-field dms-form-field--full">
                  <span className="dms-form-label">รายละเอียดอาการ/ปัญหา <span className="dms-form-required">*</span></span>
                  <textarea className="dms-form-input dms-form-textarea" value={form.problem ?? ''} onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))} />
                  {errors.problem && <div className="dms-form-error">{errors.problem}</div>}
                </label>
              </div>

              <section className="dms-pm-create-section">
                <div className="dms-pm-create-grid">
                  <label className="dms-form-field">
                    <span className="dms-form-label">ประเภทปัญหา</span>
                    <input className="dms-form-input" value={form.problemType ?? ''} onChange={(e) => setForm((f) => ({ ...f, problemType: e.target.value }))} />
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">ระดับความเร่งด่วน</span>
                    <select className="dms-form-input" value={form.priority ?? 'medium'} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}>
                      <option value="low">ต่ำ</option>
                      <option value="medium">ปานกลาง</option>
                      <option value="high">สูง</option>
                      <option value="critical">วิกฤต</option>
                    </select>
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">สถานะ</span>
                    <select className="dms-form-input" value={form.status ?? 'reported'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}>
                      <option value="reported">แจ้งปัญหา</option>
                      <option value="awaiting_inspection">รอตรวจสอบ</option>
                      <option value="queued">รอดำเนินการ</option>
                      <option value="in_progress">กำลังซ่อม</option>
                      <option value="awaiting_acceptance">รอตรวจรับ</option>
                      <option value="done">เสร็จสิ้น</option>
                      <option value="cancelled">ยกเลิก</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="dms-pm-create-section">
                <div className="dms-pm-create-grid">
                  <label className="dms-form-field">
                    <span className="dms-form-label">วันที่ร้องขอ</span>
                    <input className="dms-form-input" type="date" value={form.requestedDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, requestedDate: e.target.value }))} />
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">เริ่มงาน (แผน)</span>
                    <input className="dms-form-input" type="date" value={form.plannedStart ?? ''} onChange={(e) => setForm((f) => ({ ...f, plannedStart: e.target.value }))} />
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">สิ้นสุดงาน (แผน)</span>
                    <input className="dms-form-input" type="date" value={form.plannedEnd ?? ''} onChange={(e) => setForm((f) => ({ ...f, plannedEnd: e.target.value }))} />
                  </label>
                </div>
              </section>

              <div className="dms-pm-create-grid">
                <label className="dms-form-field">
                  <span className="dms-form-label">ผู้รับผิดชอบ / ทีม</span>
                  <input className="dms-form-input" value={form.responsible ?? ''} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} />
                </label>
                <label className="dms-form-field">
                  <span className="dms-form-label">สถานที่</span>
                  <input className="dms-form-input" value={form.location ?? ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </label>
              </div>

              <div className="dms-pm-create-grid">
                <label className="dms-form-field">
                  <span className="dms-form-label">ประมาณการค่าใช้จ่าย</span>
                  <input className="dms-form-input" type="number" value={String(form.estimatedCost ?? '')} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: Number(e.target.value || 0) }))} />
                </label>
                <label className="dms-form-field dms-form-field--full">
                  <span className="dms-form-label">หมายเหตุ</span>
                  <textarea className="dms-form-input dms-form-textarea" value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </label>
              </div>

              <div className="dms-pm-create-footer">
                <button type="button" className="dms-back-btn" onClick={() => onOpenChange(false)}>ยกเลิก</button>
                <button type="submit" className="dms-pm-submit-btn">{editing ? 'บันทึกการแก้ไข' : 'สร้างโครงการ'}</button>
              </div>
            </form>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
