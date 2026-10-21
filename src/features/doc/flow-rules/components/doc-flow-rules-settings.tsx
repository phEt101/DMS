import { useEffect, useState } from 'react'
import { FaEye, FaPlus, FaXmark } from 'react-icons/fa6'
import { getFlowRules, saveFlowRules, type ApiFlowRule, type ApiFlowRulesResponse } from '../../services/employee-requests.service'
import { effectiveRecordStage, FlowRuleCard, type FlowRuleLike } from './FlowRuleCard'

type Props = { copy: any; showToast: (message: string, type: 'success' | 'error') => void }

type DraftRule = FlowRuleLike & { key: string }

// ขั้นแรก = ขั้นแรกที่เปิดอยู่ (ให้ภาพใน UI ตรงกับที่ backend ทำจริง)
const firstEnabled = (rule: Pick<FlowRuleLike, 'requireManagerStage' | 'requireExecutiveStage'>): FlowRuleLike['firstStage'] =>
  rule.requireManagerStage ? 'pending_mgr' : rule.requireExecutiveStage ? 'pending_exec' : 'pending_hr'

const toDraft = (rule: ApiFlowRule): DraftRule => ({
  key: `rule-${rule.id}`, id: rule.id, scope: rule.scope,
  departmentId: rule.departmentId, roleId: rule.roleId, kind: rule.kind,
  firstStage: firstEnabled(rule),
  managerUserId: rule.managerUserId, executiveUserId: rule.executiveUserId,
  requireManagerStage: rule.requireManagerStage, requireExecutiveStage: rule.requireExecutiveStage,
  requireHrStage: rule.requireHrStage,
  recordAfterStage: rule.requireHrStage ? 'hr' : rule.recordAfterStage,
  // สมุดบันทึก/รายงานบันทึกเสมอ — เดิมมี toggle ให้ปิด แต่ไม่ใช้แล้ว (บังคับเป็น true ตอน save)
  visibleInRecords: true, isActive: rule.isActive,
})

export default function DocFlowRulesSettings({ copy: c, showToast }: Props) {
  const [options, setOptions] = useState<ApiFlowRulesResponse | null>(null)
  const [rules, setRules] = useState<DraftRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFlowRules()
      .then((data) => {
        if (cancelled) return
        setOptions(data)
        setRules(data.rules.map(toDraft))
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [])

  const update = (key: string, patch: Partial<DraftRule>) =>
    setRules((current) => current.map((rule) => rule.key === key ? { ...rule, ...patch } : rule))
  const addRule = () => setRules((current) => [...current, {
    key: `new-${Date.now()}-${current.length}`, scope: 'department', departmentId: null, roleId: null, kind: 'all',
    firstStage: 'pending_mgr', managerUserId: null, executiveUserId: null,
    requireManagerStage: true, requireExecutiveStage: false, requireHrStage: true,
    recordAfterStage: null, visibleInRecords: true, isActive: true,
  }])
  const removeRule = (key: string) => setRules((current) => current.filter((rule) => rule.key !== key))

  const save = async () => {
    if (saving) return
    const invalid = rules.find((rule) => rule.scope === 'department' && rule.departmentId === null)
      ?? rules.find((rule) => rule.scope === 'role' && rule.roleId === null)
    if (invalid) { showToast(c.flow.ruleIncomplete, 'error'); return }
    setSaving(true)
    try {
      await saveFlowRules(rules.map(({ key: _key, id: _id, ...rest }) => ({ ...rest, visibleInRecords: true })))
      showToast(c.flow.saved, 'success')
      const data = await getFlowRules()
      setOptions(data); setRules(data.rules.map(toDraft))
    } catch (err) {
      showToast(err instanceof Error ? err.message : c.flow.saveError, 'error')
    } finally { setSaving(false) }
  }

  const stageLabelFor = (stage: string) =>
    stage === 'pending_mgr' ? c.statuses.pending_mgr : stage === 'pending_exec' ? c.statuses.pending_exec : c.statuses.pending_hr
  const recordStageLabel = (stage: string) =>
    stage === 'manager' ? c.statuses.pending_mgr : stage === 'executive' ? c.statuses.pending_exec : c.statuses.pending_hr
  const stageName = (stage: string) =>
    stage === 'manager' || stage === 'pending_mgr' ? c.flow.stageManager
      : stage === 'executive' || stage === 'pending_exec' ? c.flow.stageExecutive
        : c.flow.stageHr
  const approverName = (id: number | null, fallback: string) =>
    options?.approvers.find((approver) => approver.id === id)?.name ?? fallback
  const routeFor = (rule: Pick<FlowRuleLike, 'requireManagerStage' | 'requireExecutiveStage' | 'requireHrStage' | 'managerUserId' | 'executiveUserId'>) => {
    const stages = [
      ...(rule.requireManagerStage ? [approverName(rule.managerUserId, c.flow.autoManager)] : []),
      ...(rule.requireExecutiveStage ? [approverName(rule.executiveUserId, c.flow.autoExecutive)] : []),
      ...(rule.requireHrStage ? [c.flow.stageHr] : []),
    ]
    return [c.flow.submitter, ...(stages.length ? stages : [c.flow.stageHr])].join(' → ')
  }
  const targetLabel = (rule: DraftRule) => rule.scope === 'department'
    ? options?.departments.find((department) => department.id === rule.departmentId)?.name ?? c.flow.selectPrompt
    : options?.roles.find((role) => role.id === rule.roleId)?.name ?? c.flow.selectPrompt
  const kindLabel = (kind: string) => kind === 'all' ? c.flow.kindAll : c.kinds[kind] ?? kind
  const documentKinds = [...new Set([...Object.keys(c.kinds), ...rules.map((rule) => rule.kind).filter((kind) => kind !== 'all')])]
  const roleLabel = (name: string) => {
    const translatedRole = ({ user: c.flow.roleUser, admin: c.flow.roleAdmin, manager: c.flow.roleManager, executive: c.flow.roleExecutive, hr: c.flow.roleHr } as Record<string, string>)[name]
    return translatedRole ?? name
  }
  const effectiveFlowFor = (department: { id: number | null; name: string; isHrDepartment: boolean }, role: { id: number; name: string }, kind: string) => {
    const matchingRules = rules.filter((rule) =>
      rule.isActive && (rule.kind === 'all' || rule.kind === kind) && (
        rule.scope === 'department'
          ? rule.departmentId !== null && rule.departmentId === department.id
          : rule.roleId !== null && rule.roleId === role.id
      ),
    )
    const priority = (rule: DraftRule) => (rule.scope === 'department' ? 2 : 1) * 2 + (rule.kind === kind ? 1 : 0)
    const matchedRule = matchingRules.sort((left, right) => priority(right) - priority(left))[0]
    if (matchedRule) {
      return {
        route: routeFor(matchedRule),
        source: `${c.flow.ruleNumber.replace('{number}', String(rules.indexOf(matchedRule) + 1))} · ${matchedRule.scope === 'department' ? c.flow.scopeDepartment : c.flow.scopeRole}`,
        recordAt: stageName(effectiveRecordStage(matchedRule)),
        visible: matchedRule.visibleInRecords,
      }
    }

    const stages = role.name === 'executive'
      ? [c.flow.stageHr]
      : department.isHrDepartment || role.name === 'hr'
        ? [c.flow.defaultHrRoute]
        : role.name === 'manager'
          ? [c.flow.autoExecutive, c.flow.stageHr]
          : [c.flow.defaultEmployeeRoute]
    return {
      route: [c.flow.submitter, ...stages].join(' → '),
      source: c.flow.defaultFlow,
      recordAt: stageName(options!.defaultFlow.steps.recordAfterStage),
      visible: options!.defaultFlow.visibleInRecords,
    }
  }
  const reviewItems = rules.flatMap((rule, index) => {
    const items: string[] = []
    if (!rule.isActive) items.push(c.flow.reviewInactive.replace('{number}', String(index + 1)))
    if ((rule.scope === 'department' && rule.departmentId === null) || (rule.scope === 'role' && rule.roleId === null)) {
      items.push(c.flow.reviewIncomplete.replace('{number}', String(index + 1)))
    }
    return items
  })
  const activeRuleKeys = new Set<string>()
  rules.forEach((rule) => {
    if (!rule.isActive) return
    const targetId = rule.scope === 'department' ? rule.departmentId : rule.roleId
    if (targetId === null) return
    const key = `${rule.scope}:${targetId}:${rule.kind}`
    if (activeRuleKeys.has(key)) reviewItems.push(c.flow.reviewDuplicate.replace('{target}', targetLabel(rule)).replace('{kind}', kindLabel(rule.kind)))
    activeRuleKeys.add(key)
  })

  // ดึงข้อความจาก documents.json (flow.xxx) ถ้าไม่มีคีย์ → คืนค่าว่าง แล้วการ์ดจะใช้ข้อความไทยที่ฝังไว้
  const t = (key: string) => (c.flow as Record<string, string>)[key.replace(/^flow\./, '')] ?? ''
  const kindOptions = [
    { value: 'all', label: c.flow.kindAll as string },
    ...Object.entries(c.kinds as Record<string, string>).map(([value, label]) => ({ value, label })),
  ]
  // ภาพรวม: ซ่อน admin และแผนกที่ไม่มีกฎเกี่ยวข้อง — เริ่มต้นแสดง กรรมการผู้จัดการ/ผู้จัดการ/พนักงาน
  // + แผนก/บทบาทที่มีกฎอ้างถึงเท่านั้น (เช่นเพิ่มกฎของ HR Div. → แสดงแผนก HR เพิ่ม)
  const activeRules = rules.filter((rule) => rule.isActive)
  const ruleDepartments = [...new Set(activeRules.filter((rule) => rule.scope === 'department' && rule.departmentId !== null).map((rule) => rule.departmentId!))]
  const ruleRoleIds = [...new Set(activeRules.filter((rule) => rule.scope === 'role' && rule.roleId !== null).map((rule) => rule.roleId!))]
  const DEFAULT_OVERVIEW_ROLES = ['executive', 'manager', 'user']
  const overviewRoles = options
    ? options.roles.filter((role) => role.name !== 'admin'
      && (DEFAULT_OVERVIEW_ROLES.includes(role.name) || ruleRoleIds.includes(role.id)))
    : []
  const overviewDepartments = options
    ? [{ id: null, name: c.flow.noDepartment as string, isHrDepartment: false },
       ...options.departments.filter((department) => ruleDepartments.includes(department.id))]
    : []

  return <section className="documents-policy-panel documents-flow-panel">
    <div className="documents-policy-intro"><div>
      <h2>{c.flow.title}</h2>
      <p>{c.flow.subtitle}</p>
      <small>{c.flow.hint}</small>
    </div>
      {!loading && !error && options && <button type="button" className="documents-flow-overview-button" onClick={() => setOverviewOpen(true)}>
        <FaEye /> {c.flow.overviewButton}
      </button>}
    </div>
    {loading && <p className="documents-empty">{c.flow.loading}</p>}
    {!loading && error && <p className="documents-empty" role="alert">{error}</p>}
    {!loading && !error && options && <div className="documents-flow-current">
      <h3>{c.flow.currentTitle}</h3>
      <p className="documents-flow-current-default">
        <b>{c.flow.currentDefault}</b>{' '}
        {options.defaultFlow.steps.stages.map((stage) => stageLabelFor(stage)).join(' → ')}
        {' · '}{c.flow.recordAfter}: <b>{recordStageLabel(options.defaultFlow.steps.recordAfterStage)}</b>
      </p>
      {rules.length > 0 && <p className="documents-flow-current-rules">
        {c.flow.currentRulesPrefix} {rules.length} {c.flow.currentRulesUnit}
      </p>}
    </div>}
    {!loading && !error && options && <div className="documents-flow-rules">
      {rules.length === 0 && <p className="documents-empty">{c.flow.empty}</p>}
      {rules.map((rule) => (
        <FlowRuleCard
          key={rule.key}
          rule={rule}
          options={options}
          kindOptions={kindOptions}
          t={t}
          onChange={(patch) => update(rule.key, patch)}
          onRemove={() => removeRule(rule.key)}
        />
      ))}
      <div className="documents-policy-actions">
        <button type="button" className="dms-back-btn" onClick={addRule}><FaPlus /> {c.flow.addRule}</button>
        <button type="button" className="dms-create-btn" disabled={saving} onClick={() => { void save() }}>{saving ? c.flow.saving : c.flow.save}</button>
      </div>
    </div>}
    {overviewOpen && options && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOverviewOpen(false) }}>
      <section className="documents-modal documents-flow-overview-modal" role="dialog" aria-modal="true" aria-labelledby="flow-overview-title">
        <div className="documents-modal-head">
          <div><h2 id="flow-overview-title">{c.flow.overviewTitle}</h2><p>{c.flow.overviewSubtitle}</p></div>
          <button type="button" aria-label={c.detail.close} onClick={() => setOverviewOpen(false)}><FaXmark /></button>
        </div>
        <p className="documents-flow-overview-note">{c.flow.overviewNote}</p>
        <section className="documents-flow-overview-section">
          <div className="documents-flow-overview-section-title">
            <h3>{c.flow.defaultFlow}</h3><span className="documents-flow-status">{c.flow.fallback}</span>
          </div>
          <p className="documents-flow-overview-route">
            {[c.flow.submitter, ...options.defaultFlow.steps.stages.map((stage) => stageName(stage))].join(' → ')}
          </p>
          <small>{c.flow.recordAfter}: <b>{stageName(options.defaultFlow.steps.recordAfterStage)}</b></small>
        </section>
        <section className="documents-flow-overview-section">
          <div className="documents-flow-overview-section-title">
            <h3>{c.flow.rulesOverview}</h3><span className="documents-flow-status">{rules.filter((rule) => rule.isActive).length} / {rules.length} {c.flow.activeRules}</span>
          </div>
          {rules.length === 0
            ? <p className="documents-flow-overview-empty">{c.flow.empty}</p>
            : <ol className="documents-flow-overview-list">{rules.map((rule, index) => {
              const recordAt = effectiveRecordStage(rule)
              return <li key={rule.key} className={!rule.isActive ? 'is-inactive' : ''}>
                <div className="documents-flow-overview-rule-head">
                  <b>{c.flow.ruleNumber.replace('{number}', String(index + 1))}: {rule.scope === 'department' ? c.flow.scopeDepartment : c.flow.scopeRole} · {targetLabel(rule)} · {kindLabel(rule.kind)}</b>
                  <span className={rule.isActive ? 'is-active' : 'is-disabled'}>{rule.isActive ? c.flow.active : c.flow.inactive}</span>
                </div>
                <p className="documents-flow-overview-route">{routeFor(rule)}</p>
                <small>{c.flow.recordAfter}: <b>{stageName(recordAt)}</b> · {rule.visibleInRecords ? c.flow.visibleInRecords : c.flow.hiddenFromRecords}</small>
              </li>
            })}</ol>}
        </section>
        <section className="documents-flow-overview-section">
          <div className="documents-flow-overview-section-title">
            <h3>{c.flow.accessByGroup}</h3>
            <span>{overviewDepartments.length * overviewRoles.length} {c.flow.groupCombinations}</span>
          </div>
          <p className="documents-flow-matrix-note">{c.flow.accessByGroupNote}</p>
          <div className="documents-flow-matrix">
            {overviewDepartments.map((department) => (
              <details className="documents-flow-matrix-department" key={department.id ?? 'no-department'}>
                <summary>{department.name}</summary>
                <div className="documents-flow-matrix-roles">
                  {overviewRoles.map((role) => (
                    <details className="documents-flow-matrix-role" key={`${department.id ?? 'none'}-${role.id}`}>
                      <summary>{roleLabel(role.name)}</summary>
                      <div className="documents-flow-matrix-routes">
                        {documentKinds.map((kind) => {
                          const flow = effectiveFlowFor(department, role, kind)
                          return <article key={kind}>
                            <b>{kindLabel(kind)}</b>
                            <p>{flow.route}</p>
                            <small>{c.flow.appliedFrom}: <b>{flow.source}</b></small>
                            <small>{c.flow.recordAfter}: <b>{flow.recordAt}</b> · {flow.visible ? c.flow.visibleInRecords : c.flow.hiddenFromRecords}</small>
                          </article>
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
        <section className="documents-flow-overview-section documents-flow-review">
          <div className="documents-flow-overview-section-title"><h3>{c.flow.reviewTitle}</h3><span>{reviewItems.length}</span></div>
          {reviewItems.length
            ? <ul>{reviewItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
            : <p>{c.flow.reviewNone}</p>}
          <small>{c.flow.priorityNote}</small>
        </section>
        <div className="documents-flow-overview-actions">
          <button type="button" className="dms-back-btn" onClick={() => setOverviewOpen(false)}>{c.detail.close}</button>
          <button type="button" className="dms-create-btn" onClick={() => setOverviewOpen(false)}>{c.flow.editRules}</button>
        </div>
      </section>
    </div>}
  </section>
}
