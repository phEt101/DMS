import type { MockPolicy } from '../../document-types'
type Props = { policyDraft: MockPolicy; onChange: (next: MockPolicy) => void; onReset: () => void; onSave: () => void; copy: any }
export default function DocLeavePolicySettings({ policyDraft, onChange, onReset, onSave, copy: c }: Props) {
  const set = <K extends keyof MockPolicy>(key: K, value: MockPolicy[K]) => onChange({ ...policyDraft, [key]: value })
  return <section className="documents-policy-panel">
    <div className="documents-policy-intro"><div><h2>{c.policy.title}</h2><p>{c.policy.subtitle}</p><small>{c.policy.emergencyRule}</small></div></div>
    <div className="documents-policy-grid">
      <label><span>{c.policy.year}</span><input type="number" min="0" value={policyDraft.year} onChange={e=>set('year',Number(e.target.value))}/></label>
      <label><span>{c.policy.expiry}</span><input value={policyDraft.expiry} onChange={e=>set('expiry',e.target.value)}/></label>
      <label><span>{c.policy.yearStart}</span><input type="date" value={policyDraft.yearStart} onChange={e=>set('yearStart',e.target.value)}/></label>
      <label><span>{c.policy.yearEnd}</span><input type="date" value={policyDraft.yearEnd} onChange={e=>set('yearEnd',e.target.value)}/></label>
      <label><span>{c.policy.personalLead}</span><input type="number" min="0" value={policyDraft.leadPersonal} onChange={e=>set('leadPersonal',Number(e.target.value))}/></label>
      <label><span>{c.policy.vacationLead}</span><input type="number" min="0" value={policyDraft.leadVacation} onChange={e=>set('leadVacation',Number(e.target.value))}/></label>
      <label><span>{c.policy.hoursPerDay}</span><input type="number" min="0.5" step="0.5" value={policyDraft.hoursPerDay} onChange={e=>set('hoursPerDay',Number(e.target.value))}/></label>
      <label><span>{c.policy.hourStep}</span><input type="number" min="0.5" step="0.5" value={policyDraft.hourStep} onChange={e=>set('hourStep',Number(e.target.value))}/></label>
      <label><span>{c.policy.certificate}</span><input type="number" min="0" value={policyDraft.certDays} onChange={e=>set('certDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.otMax}</span><input type="number" min="0" step="0.5" value={policyDraft.otMax} onChange={e=>set('otMax',Number(e.target.value))}/></label>
      <label><span>{c.policy.fixDays}</span><input type="number" min="0" value={policyDraft.fixDays} onChange={e=>set('fixDays',Number(e.target.value))}/></label>
    </div>
    <div className="documents-policy-actions"><button className="dms-back-btn" onClick={onReset}>{c.policy.reset}</button><button className="dms-create-btn" onClick={onSave}>{c.policy.save}</button></div>
  </section>
}
