import type { MockPolicy } from '../../document-types'
type Props = { policyDraft: MockPolicy; onChange: (next: MockPolicy) => void; onReset: () => void; onSave: () => void }
export default function DocLeavePolicySettings({ policyDraft, onChange, onReset, onSave }: Props) {
  const set = <K extends keyof MockPolicy>(key: K, value: MockPolicy[K]) => onChange({ ...policyDraft, [key]: value })
  return <section className="documents-policy-panel">
    <div className="documents-policy-intro"><div><h2>นโยบายการลาและเอกสาร</h2><p>ค่าเหล่านี้ระบบใช้ตรวจเอกสารตอนพนักงานยื่น</p></div></div>
    <div className="documents-policy-grid">
      <label><span>ปีสิทธิวันลา (พ.ศ.)</span><input type="number" min="0" value={policyDraft.year} onChange={e=>set('year',Number(e.target.value))}/></label>
      <label><span>สิทธิวันลาใช้ได้ถึง (ข้อความบนฟอร์ม)</span><input value={policyDraft.expiry} onChange={e=>set('expiry',e.target.value)}/></label>
      <label><span>ปีสิทธิ์เริ่มวันที่</span><input type="date" value={policyDraft.yearStart} onChange={e=>set('yearStart',e.target.value)}/></label>
      <label><span>ปีสิทธิ์สิ้นสุดวันที่</span><input type="date" value={policyDraft.yearEnd} onChange={e=>set('yearEnd',e.target.value)}/></label>
      <label><span>ลากิจยื่นล่วงหน้า (วัน)</span><input type="number" min="0" value={policyDraft.leadPersonal} onChange={e=>set('leadPersonal',Number(e.target.value))}/></label>
      <label><span>ลาพักร้อนยื่นล่วงหน้า (วันทำการ)</span><input type="number" min="0" value={policyDraft.leadVacation} onChange={e=>set('leadVacation',Number(e.target.value))}/></label>
      <label><span>พักร้อนฉุกเฉินต่อปี (วัน) ค่าเริ่มต้นพนักงานใหม่</span><input type="number" min="0" value={policyDraft.emergencyDays} onChange={e=>set('emergencyDays',Number(e.target.value))}/></label>
      <label><span>1 วันทำงาน = (ชั่วโมง)</span><input type="number" min="0.5" step="0.5" value={policyDraft.hoursPerDay} onChange={e=>set('hoursPerDay',Number(e.target.value))}/></label>
      <label><span>หน่วยขั้นต่ำเมื่อลาเป็นชั่วโมง (ชม.)</span><input type="number" min="0.5" step="0.5" value={policyDraft.hourStep} onChange={e=>set('hourStep',Number(e.target.value))}/></label>
      <label><span>ลาพักร้อนฉุกเฉินใช้ได้เมื่อ</span><select value={policyDraft.emergencyNeedsPersonal ? '1' : '0'} onChange={e=>set('emergencyNeedsPersonal',e.target.value==='1')}><option value="1">สิทธิ์ลากิจไม่พอสำหรับคำขอ</option><option value="0">ไม่ต้องรอลากิจหมดก่อน</option></select></label>
      <label><span>ลาป่วยแนบใบรับรองแพทย์เมื่อลา (วันขึ้นไป)</span><input type="number" min="0" value={policyDraft.certDays} onChange={e=>set('certDays',Number(e.target.value))}/></label>
      <label><span>OT สูงสุดต่อวัน (ชั่วโมง)</span><input type="number" min="0" step="0.5" value={policyDraft.otMax} onChange={e=>set('otMax',Number(e.target.value))}/></label>
      <label><span>แก้ไขเวลาย้อนหลังได้ไม่เกิน (วัน)</span><input type="number" min="0" value={policyDraft.fixDays} onChange={e=>set('fixDays',Number(e.target.value))}/></label>
    </div>
    <div className="documents-policy-actions"><button className="dms-back-btn" onClick={onReset}>รีเซ็ตข้อมูลตัวอย่าง</button><button className="dms-create-btn" onClick={onSave}>บันทึกนโยบาย</button></div>
  </section>
}
