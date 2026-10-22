// ไฟล์นี้ไม่ import อะไรจากโปรเจกต์ (ยกเว้น TargetPicker ที่อยู่โฟลเดอร์เดียวกัน)
// type ด้านล่างมีรูปร่างเดียวกับ ApiFlowRule / ApiFlowOptions ใน employee-requests.service.ts
import { useState } from 'react'
import { TargetPicker } from './TargetPicker'

type Stage = 'manager' | 'executive' | 'hr'
type FirstStage = 'default' | 'pending_mgr' | 'pending_exec' | 'pending_hr'

export type FlowRuleLike = {
  id?: number; scope: 'department' | 'role'; departmentId: number | null; roleId: number | null; kind: string
  /** แผนก/บทบาทที่กฎครอบคลุม — เลือกได้หลายตัวในกฎเดียว */
  targetIds: number[]
  /** บทบาทที่กฎจำกัดเพิ่ม (เฉพาะ scope=department) — ว่าง = ทุกบทบาท */
  roleIds?: number[]
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
  roleFilter: 'จำกัดบทบาท (ไม่บังคับ)',
  kindAll: 'ทุกประเภท', kindLeave: 'ลา', kindOt: 'OT', kindTimefix: 'แก้เวลา', kindOuting: 'ออกนอกสถานที่',
  pickDepartments: 'เลือกแผนก', pickRoles: 'เลือกบทบาท', search: 'ค้นหา...', selectAll: 'เลือกทั้งหมด',
  clear: 'ล้าง', done: 'เสร็จสิ้น', noResult: 'ไม่พบรายการ',
  roleAll: 'ทุกบทบาท', roleSome: 'เฉพาะบางบทบาท', appliesTo: 'ใช้กับ',
  roleSomeEmptyHint: 'ยังไม่ได้เลือกบทบาท — ตอนนี้ระบบจะถือว่าใช้กับทุกบทบาท',
  autoManagerPlaceholder: '— อัตโนมัติ (manager ประจำแผนกผู้ยื่น) —',
  autoExecutivePlaceholder: '— อัตโนมัติ (กรรมการผู้จัดการทุกคน) —',
  recordAfterHrOnly: 'ต้องผ่าน HR — บันทึกหลัง HR อนุมัติ',
}
const DEFAULT_KINDS = [
  { value: 'all', k: 'kindAll' }, { value: 'leave', k: 'kindLeave' }, { value: 'ot', k: 'kindOt' },
  { value: 'timefix', k: 'kindTimefix' }, { value: 'outing', k: 'kindOuting' },
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

  const [roleMode, setRoleMode] = useState<'all' | 'some'>((rule.roleIds?.length ?? 0) > 0 ? 'some' : 'all')
  const targetSource = rule.scope === 'department' ? options.departments : options.roles
  const namesOf = (list: Array<{ id: number; name: string }>, ids: number[]) =>
    ids.map((id) => list.find((x) => x.id === id)?.name ?? `#${id}`).join(', ')
  const kindLabel = kinds.find((k) => k.value === rule.kind)?.label ?? rule.kind
  const appliesText = [
    rule.targetIds.length ? namesOf(targetSource, rule.targetIds) : tr('selectPrompt'),
    rule.scope === 'department' ? (rule.roleIds?.length ? namesOf(options.roles, rule.roleIds) : tr('roleAll')) : null,
    kindLabel,
  ].filter(Boolean).join(' · ')

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

  const pickerLabels = {
    searchText: tr('search'), selectAllText: tr('selectAll'), clearText: tr('clear'),
    doneText: tr('done'), noResultText: tr('noResult'),
  }

  return (
    <section className="flow-card">
      <header className="flow-card-head">
        <div className="flow-card-target">
          <div className="flow-field">
            <span>{tr('scope')}</span>
            <div className="flow-seg" role="radiogroup" aria-label={tr('scope')}>
              {(['department', 'role'] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={rule.scope === s}
                  className={rule.scope === s ? 'is-on' : ''}
                  onClick={() => {
                    if (rule.scope === s) return
                    setRoleMode('all')
                    onChange({ scope: s, targetIds: [], departmentId: null, roleId: null, roleIds: [] })
                  }}>
                  {tr(s === 'department' ? 'scopeDepartment' : 'scopeRole')}
                </button>
              ))}
            </div>
          </div>

          <div className="flow-field">
            <span>{rule.scope === 'department' ? tr('department') : tr('role')}</span>
            <TargetPicker
              options={targetSource}
              value={rule.targetIds}
              title={rule.scope === 'department' ? tr('pickDepartments') : tr('pickRoles')}
              emptyText={tr('selectPrompt')}
              {...pickerLabels}
              onChange={(ids) => onChange(rule.scope === 'department'
                ? { targetIds: ids, departmentId: ids[0] ?? null, roleId: null }
                : { targetIds: ids, roleId: ids[0] ?? null, departmentId: null })}
            />
          </div>

          {rule.scope === 'department' && (
            <div className="flow-field">
              <span>{tr('roleFilter')}</span>
              <div className="flow-seg" role="radiogroup" aria-label={tr('roleFilter')}>
                <button type="button" role="radio" aria-checked={roleMode === 'all'} className={roleMode === 'all' ? 'is-on' : ''}
                  onClick={() => { setRoleMode('all'); onChange({ roleIds: [] }) }}>{tr('roleAll')}</button>
                <button type="button" role="radio" aria-checked={roleMode === 'some'} className={roleMode === 'some' ? 'is-on' : ''}
                  onClick={() => setRoleMode('some')}>{tr('roleSome')}</button>
              </div>
              {roleMode === 'some' && (
                <>
                  <TargetPicker
                    options={options.roles} value={rule.roleIds ?? []}
                    title={tr('pickRoles')} emptyText={tr('pickRoles')}
                    {...pickerLabels}
                    onChange={(ids) => onChange({ roleIds: ids })}
                  />
                  {(rule.roleIds?.length ?? 0) === 0 && <small className="flow-target-hint">{tr('roleSomeEmptyHint')}</small>}
                </>
              )}
            </div>
          )}

          <label className="flow-field">
            <span>{tr('kind')}</span>
            <select value={rule.kind} onChange={(e) => onChange({ kind: e.target.value })}>
              {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>

          <p className="flow-applies"><b>{tr('appliesTo')}:</b> {appliesText}</p>
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
            <small className="flow-after-note">{tr('visibleInRecords')}</small>
          </div>
        </li>
      </ol>

      <p className="flow-summary">
        {anyOn ? <>{tr('route')}: <b>{summary}</b></> : <span className="flow-warn">{tr('noStageWarn')}</span>}
      </p>
    </section>
  )
}