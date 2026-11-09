import type { MockPolicy } from '../../document-types'
type Props = { policyDraft: MockPolicy; onChange: (next: MockPolicy) => void; onReset: () => void; onSave: () => void; canManage: boolean; copy: any }
export default function DocLeavePolicySettings({ policyDraft, onChange, onReset, onSave, canManage, copy: c }: Props) {
  const set = <K extends keyof MockPolicy>(key: K, value: MockPolicy[K]) => onChange({ ...policyDraft, [key]: value })
  return <section className="documents-policy-panel">
    <div className="documents-policy-intro"><div><h2>{c.policy.title}</h2><p>{c.policy.subtitle}</p><small>{String(c.policy.emergencyRule).replace('{days}', String(policyDraft.emergencyMaxDays))}</small></div></div>
    <fieldset className="documents-policy-fields" disabled={!canManage}>
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
      <label><span>{c.policy.emergencyMaxDays}</span><input type="number" min="0" max="999.99" step="0.5" value={policyDraft.emergencyMaxDays} onChange={e=>set('emergencyMaxDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.ordainMaxDays}</span><input type="number" min="0" max="999" step="1" value={policyDraft.ordainMaxDays} onChange={e=>set('ordainMaxDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.compassionateEmployeeMaxDays}</span><input type="number" min="0" max="999" step="1" value={policyDraft.compassionateEmployeeMaxDays} onChange={e=>set('compassionateEmployeeMaxDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.compassionateEmployeePaidDays}</span><input type="number" min="0" max={policyDraft.compassionateEmployeeMaxDays} step="1" value={policyDraft.compassionateEmployeePaidDays} onChange={e=>set('compassionateEmployeePaidDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.compassionateSpouseParentMaxDays}</span><input type="number" min="0" max="999" step="1" value={policyDraft.compassionateSpouseParentMaxDays} onChange={e=>set('compassionateSpouseParentMaxDays',Number(e.target.value))}/></label>
      <label><span>{c.policy.compassionateSpouseParentPaidDays}</span><input type="number" min="0" max={policyDraft.compassionateSpouseParentMaxDays} step="1" value={policyDraft.compassionateSpouseParentPaidDays} onChange={e=>set('compassionateSpouseParentPaidDays',Number(e.target.value))}/></label>
    </div>
    </fieldset>
    {canManage && <div className="documents-policy-actions"><button className="dms-back-btn" onClick={onReset}>{c.policy.reset}</button><button className="dms-create-btn" onClick={onSave}>{c.policy.save}</button></div>}
  </section>
}
