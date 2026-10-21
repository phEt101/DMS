// ไฟล์นี้ไม่ import อะไรจากโปรเจกต์ → วางข้าง doc-flow-rules-settings.tsx ได้เลย
// type ด้านล่างมีรูปร่างเดียวกับ ApiFlowRule / ApiFlowOptions ใน employee-requests.service.ts

type Stage = 'manager' | 'executive' | 'hr'
type FirstStage = 'default' | 'pending_mgr' | 'pending_exec' | 'pending_hr'

export type FlowRuleLike = {
  id?: number; scope: 'department' | 'role'; departmentId: number | null; roleId: number | null; kind: string
  firstStage: FirstStage; managerUserId: number | null; executiveUserId: number | null
  requireManagerStage: boolean; requireExecutiveStage: boolean; requireHrStage: boolean
  recordAfterStage: Stage | null; visibleInRecords: boolean; isActive: boolean
}
export type FlowOptionsLike = {
  departments: Array<{ id: number; name: string }>
  roles: Array<{ id: number; name: string }>
  approvers: Array<{ id: number; name: string; roleName: string; departmentName: string }>
}

// ข้อความเริ่มต้น (ไทย) — ถ้าส่ง t มา และมีคีย์ flow.xxx ใน documents.json จะใช้ของ locale แทน
const DEFAULT_TEXT: Record<string, string> = {
  scope: 'ประเภทกฎ', scopeDepartment: 'ตามแผนก', scopeRole: 'ตามบทบาท',
  department: 'แผนกที่ยื่น', role: 'บทบาทที่ยื่น', selectPrompt: '— เลือก —', kind: 'ประเภทเอกสาร',
  active: 'ใช้งานกฎนี้', remove: 'ลบกฎ', manager: 'ผู้จัดการที่อนุมัติ', executive: 'กรรมการผู้จัดการที่อนุมัติ',
  autoManager: '— อัตโนมัติ (manager ประจำแผนกผู้ยื่น) —', autoExecutive: '— อัตโนมัติ (กรรมการผู้จัดการทุกคน) —',
  visibleInRecords: 'แสดงในสมุดบันทึกการลา/รายงาน', hiddenFromRecords: 'ไม่แสดงในสมุดบันทึก/รายงาน',
  submitter: 'ผู้ยื่น', submitShort: 'ยื่น', stageManager: 'ผู้จัดการ', stageExecutive: 'กรรมการผู้จัดการ', stageHr: 'ฝ่ายบุคคล (HR)',
  stageOn: 'ต้องผ่านขั้นนี้', stageOff: 'ข้ามขั้นนี้', recordHere: 'ให้จบ/บันทึกที่ขั้นนี้', recordedHere: 'อนุมัติแล้วบันทึกลงสมุด',
  afterRecordNote: 'ไม่ถูกใช้ — เอกสารจบที่ขั้นก่อนหน้า', ledger: 'สมุดบันทึก / รายงาน', route: 'เส้นทาง',
  noStageWarn: '⚠ ไม่ได้เปิดขั้นอนุมัติใดเลย ระบบจะส่งให้ HR อัตโนมัติ',
  kindAll: 'ทุกประเภท', kindLeave: 'ลา', kindOt: 'OT', kindTimefix: 'แก้เวลา', kindWfh: 'WFH', kindOuting: 'ออกนอกสถานที่',
}
const DEFAULT_KINDS = [
  { value: 'all', k: 'kindAll' }, { value: 'leave', k: 'kindLeave' }, { value: 'ot', k: 'kindOt' },
  { value: 'timefix', k: 'kindTimefix' }, { value: 'wfh', k: 'kindWfh' }, { value: 'outing', k: 'kindOuting' },
]

const STAGES: Array<{ key: Stage; status: Exclude<FirstStage, 'default'>; label: string; field: 'requireManagerStage' | 'requireExecutiveStage' | 'requireHrStage' }> = [
  { key: 'manager', status: 'pending_mgr', label: 'stageManager', field: 'requireManagerStage' },
  { key: 'executive', status: 'pending_exec', label: 'stageExecutive', field: 'requireExecutiveStage' },
  { key: 'hr', status: 'pending_hr', label: 'stageHr', field: 'requireHrStage' },
]

const enabledOf = (r: FlowRuleLike): Record<Stage, boolean> => ({
  manager: r.requireManagerStage, executive: r.requireExecutiveStage, hr: r.requireHrStage,
})

/** ขั้นที่อนุมัติแล้วถือว่าจบ — ตรงกับ computeFlow ฝั่ง backend */
export function effectiveRecordStage(r: FlowRuleLike): Stage {
  const on = enabledOf(r)
  const active = STAGES.filter((s) => on[s.key]).map((s) => s.key)
  if (r.requireHrStage) return 'hr'
  if (!active.length) return 'hr'
  if (r.recordAfterStage && on[r.recordAfterStage]) return r.recordAfterStage
  return active[active.length - 1]
}

type Props = {
  rule: FlowRuleLike
  options: FlowOptionsLike
  onChange: (patch: Partial<FlowRuleLike>) => void
  onRemove: () => void
  /** ไม่บังคับ: ฟังก์ชันแปลของโปรเจกต์ เรียกเป็น t('flow.xxx') */
  t?: (key: string) => string
  kindOptions?: Array<{ value: string; label: string }>
}

export function FlowRuleCard({ rule, options, onChange, onRemove, t, kindOptions }: Props) {
  const tr = (k: string) => {
    const full = `flow.${k}`
    const v = t ? t(full) : ''
    return v && v !== full && v !== k ? v : (DEFAULT_TEXT[k] ?? k)
  }
  const kinds = kindOptions ?? DEFAULT_KINDS.map((x) => ({ value: x.value, label: tr(x.k) }))
  const on = enabledOf(rule)
  const anyOn = STAGES.some((s) => on[s.key])
  const activeStages = anyOn ? STAGES.filter((s) => on[s.key]) : STAGES.filter((s) => s.key === 'hr')
  const recordAt = effectiveRecordStage(rule)
  const recordIdx = STAGES.findIndex((s) => s.key === recordAt)

  const toggle = (stage: (typeof STAGES)[number]) => {
    const next = { ...on, [stage.key]: !on[stage.key] }
    const firstOn = STAGES.find((s) => next[s.key]) ?? STAGES[2]
    // backend ตรวจ firstStage ทุกครั้ง → ตั้งเป็น "ขั้นแรกที่เปิดอยู่" เพื่อให้ภาพตรงกับการทำงานจริง
    const patch: Partial<FlowRuleLike> = { firstStage: firstOn.status }
    if (stage.field === 'requireManagerStage') patch.requireManagerStage = next.manager
    else if (stage.field === 'requireExecutiveStage') patch.requireExecutiveStage = next.executive
    else patch.requireHrStage = next.hr
    if (on[stage.key] && rule.recordAfterStage === stage.key) patch.recordAfterStage = null
    onChange(patch)
  }

  const approverOf = (k: Stage) => (k === 'manager' ? rule.managerUserId : k === 'executive' ? rule.executiveUserId : null)
  const nameOf = (id: number | null) => options.approvers.find((a) => a.id === id)?.name
  const summary = [tr('submitter'), ...activeStages.map((s) => nameOf(approverOf(s.key)) ?? tr(s.label))].join(' → ')

  return (
    <section className="flow-card">
      <header className="flow-card-head">
        <div className="flow-card-target">
          <label>
            <span>{tr('scope')}</span>
            <select value={rule.scope} onChange={(e) => onChange({ scope: e.target.value as 'department' | 'role', departmentId: null, roleId: null })}>
              <option value="department">{tr('scopeDepartment')}</option>
              <option value="role">{tr('scopeRole')}</option>
            </select>
          </label>
          <label>
            <span>{rule.scope === 'department' ? tr('department') : tr('role')}</span>
            {rule.scope === 'department' ? (
              <select value={rule.departmentId ?? ''} onChange={(e) => onChange({ departmentId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{tr('selectPrompt')}</option>
                {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <select value={rule.roleId ?? ''} onChange={(e) => onChange({ roleId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{tr('selectPrompt')}</option>
                {options.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </label>
          <label>
            <span>{tr('kind')}</span>
            <select value={rule.kind} onChange={(e) => onChange({ kind: e.target.value })}>
              {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
        </div>
        <div className="flow-card-tools">
          <label className="flow-switch">
            <input type="checkbox" checked={rule.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} />
            <i aria-hidden="true" /><span>{tr('active')}</span>
          </label>
          <button type="button" className="flow-remove" onClick={onRemove}>{tr('remove')}</button>
        </div>
      </header>

      <ol className={`flow-track${rule.isActive ? '' : ' is-off'}`}>
        <li className="flow-node flow-node--start">
          <div className="flow-dot">{tr('submitShort')}</div>
          <div className="flow-node-body"><b>{tr('submitter')}</b></div>
        </li>

        {STAGES.map((s, i) => {
          const enabled = on[s.key]
          const isRecord = recordAt === s.key && (enabled || !anyOn)
          const afterRecord = recordIdx >= 0 && i > recordIdx && enabled
          return (
            <li key={s.key} className={`flow-node${enabled ? '' : ' is-skipped'}${afterRecord ? ' is-after' : ''}`}>
              <div className="flow-dot" aria-hidden="true">{enabled ? '✓' : '–'}</div>
              <div className="flow-node-body">
                <b>{tr(s.label)}</b>
                {enabled && s.key !== 'hr' && (
                  <select
                    aria-label={tr(s.key === 'manager' ? 'manager' : 'executive')}
                    value={approverOf(s.key) ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null
                      onChange(s.key === 'manager' ? { managerUserId: v } : { executiveUserId: v })
                    }}
                  >
                    <option value="">{tr(s.key === 'manager' ? 'autoManagerPlaceholder' : 'autoExecutivePlaceholder')}</option>
                    {options.approvers.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.departmentName}</option>)}
                  </select>
                )}
                <label className="flow-switch flow-switch--sm">
                  <input type="checkbox" checked={enabled} onChange={() => toggle(s)} />
                  <i aria-hidden="true" /><span>{enabled ? tr('stageOn') : tr('stageOff')}</span>
                </label>
                {enabled && (
                  rule.requireHrStage && s.key !== 'hr'
                    ? <small className="flow-after-note">{tr('recordAfterHrOnly')}</small>
                    : <button type="button" className={`flow-record${isRecord ? ' is-on' : ''}`} aria-pressed={isRecord}
                      onClick={() => onChange({ recordAfterStage: s.key })}>
                      {isRecord ? `● ${tr('recordedHere')}` : `○ ${tr('recordHere')}`}
                    </button>
                )}
                {afterRecord && <small className="flow-after-note">{tr('afterRecordNote')}</small>}
              </div>
            </li>
          )
        })}

        <li className="flow-node flow-node--end">
          <div className="flow-dot">📒</div>
          <div className="flow-node-body">
            <b>{tr('ledger')}</b>
            <label className="flow-switch flow-switch--sm">
              <input type="checkbox" checked={rule.visibleInRecords} onChange={(e) => onChange({ visibleInRecords: e.target.checked })} />
              <i aria-hidden="true" /><span>{rule.visibleInRecords ? tr('visibleInRecords') : tr('hiddenFromRecords')}</span>
            </label>
          </div>
        </li>
      </ol>

      <p className="flow-summary">
        {anyOn ? <>{tr('route')}: <b>{summary}</b></> : <span className="flow-warn">{tr('noStageWarn')}</span>}
      </p>
    </section>
  )
}
