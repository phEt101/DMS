import { useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { getFlowRules, saveFlowRules, type ApiFlowRule, type ApiFlowRulesResponse } from '../../services/employee-requests.service'
import { FlowRuleCard, type FlowRuleLike } from './FlowRuleCard'

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
  recordAfterStage: rule.recordAfterStage, visibleInRecords: rule.visibleInRecords, isActive: rule.isActive,
})

export default function DocFlowRulesSettings({ copy: c, showToast }: Props) {
  const [options, setOptions] = useState<ApiFlowRulesResponse | null>(null)
  const [rules, setRules] = useState<DraftRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
      await saveFlowRules(rules.map(({ key: _key, id: _id, ...rest }) => rest))
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

  // ดึงข้อความจาก documents.json (flow.xxx) ถ้าไม่มีคีย์ → คืนค่าว่าง แล้วการ์ดจะใช้ข้อความไทยที่ฝังไว้
  const t = (key: string) => (c.flow as Record<string, string>)[key.replace(/^flow\./, '')] ?? ''
  const kindOptions = [
    { value: 'all', label: c.flow.kindAll as string },
    ...Object.entries(c.kinds as Record<string, string>).map(([value, label]) => ({ value, label })),
  ]

  return <section className="documents-policy-panel documents-flow-panel">
    <div className="documents-policy-intro"><div>
      <h2>{c.flow.title}</h2>
      <p>{c.flow.subtitle}</p>
      <small>{c.flow.hint}</small>
    </div></div>
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
  </section>
}
