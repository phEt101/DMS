import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '../../../components/toast-provider'
import type { Translations, Language } from '../../../locales'
import { CM_PRIORITIES, CM_STATUSES, CM_PROBLEM_TYPES, CmProject, MOCK_CM_PROJECTS } from './mockData'

function storageKey() { return 'cm_projects_v1' }
function loadStored(): CmProject[] {
	try {
		const raw = localStorage.getItem(storageKey())
		if (!raw) return MOCK_CM_PROJECTS
		return JSON.parse(raw) as CmProject[]
	} catch { return MOCK_CM_PROJECTS }
}
function saveStored(projects: CmProject[]) { try { localStorage.setItem(storageKey(), JSON.stringify(projects)) } catch {}
}

export default function CmCreatePage({ translations, language }: { translations: Translations; language: Language }) {
	const { showToast } = useToast()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [projects, setProjects] = useState<CmProject[]>(() => loadStored())

	useEffect(() => { saveStored(projects) }, [projects])

	const { register, handleSubmit, setFocus, formState: { errors } } = useForm<Partial<CmProject>>({ defaultValues: {
		code: '', name: '', customer: '', location: '', responsible: '', problem: '', objective: '', priority: 'medium', problemType: '', status: 'reported', requestedDate: '', plannedStart: '', plannedEnd: '', estimatedCost: 0, notes: ''
	}})

	const onSubmit = handleSubmit(async (values) => {
		try {
			setIsSubmitting(true)
			const now = new Date().toISOString()
			const project: CmProject = {
				id: `cm-${Date.now()}`,
				code: (values.code || '').trim() || `CM-${Date.now()}`,
				name: (values.name || '').trim(),
				customer: (values.customer || '').trim() || '—',
				problem: (values.problem || '').trim() || '',
				objective: (values.objective || '').trim() || '',
				priority: (values.priority as any) || 'medium',
				problemType: values.problemType || '',
				status: (values.status as any) || 'reported',
				requestedDate: values.requestedDate || '',
				plannedStart: values.plannedStart || '',
				plannedEnd: values.plannedEnd || '',
				responsible: (values.responsible || '').trim() || '',
				location: (values.location || '').trim() || '',
				estimatedCost: Number(values.estimatedCost || 0),
				notes: (values.notes || '').trim() || '',
				createdAt: now,
				updatedAt: now,
			}
			setProjects((p) => [project, ...p])
			showToast('สร้างโครงการ CM เรียบร้อย', 'success')
			history.pushState({}, '', '/projects/cm')
			window.dispatchEvent(new PopStateEvent('popstate'))
		} catch (e) {
			showToast(e instanceof Error ? e.message : String(e), 'error')
		} finally { setIsSubmitting(false) }
	}, (errs) => {
		const first = Object.keys(errs)[0]
		if (first) setFocus(first as any)
		showToast('กรุณาตรวจสอบข้อมูลแบบฟอร์ม', 'error')
	})

	return (
		<section className="feature-page">
			<div className="dms-title-row">
				<div className="dms-title-block">
					<h1>สร้างโครงการ CM</h1>
					<div className="dms-subtitle">สร้างโครงการสำหรับงานซ่อมและแก้ไข (Corrective Maintenance)</div>
				</div>
				<div className="dms-title-actions">
					<button className="dms-back-btn" type="button" onClick={() => history.back()}>ย้อนกลับ</button>
				</div>
			</div>

			<form className="dms-pm-create-form" onSubmit={onSubmit} autoComplete="off">
				<div className="dms-pm-create-grid">
					<label className="dms-form-field">
						<span className="dms-form-label">ชื่อโครงการ <span className="dms-form-required">*</span>{errors.name ? <span className="dms-form-error dms-form-error--inline">{String((errors as any).name?.message ?? '')}</span> : null}</span>
						<input type="text" className="dms-form-input" {...register('name', { required: 'กรุณากรอกชื่อโครงการ' })} />
					</label>

					<label className="dms-form-field">
						<span className="dms-form-label">ลูกค้า / หน่วยงาน <span className="dms-form-required">*</span>{errors.customer ? <span className="dms-form-error dms-form-error--inline">{String((errors as any).customer?.message ?? '')}</span> : null}</span>
						<input type="text" className="dms-form-input" {...register('customer', { required: 'กรุณากรอกลูกค้า/ไซต์' })} />
					</label>

					<label className="dms-form-field">
						<span className="dms-form-label">รหัสโครงการ</span>
						<input type="text" className="dms-form-input" {...register('code')} />
					</label>

					<label className="dms-form-field dms-form-field--full">
						<span className="dms-form-label">รายละเอียดอาการ/ปัญหา <span className="dms-form-required">*</span>{errors.problem ? <span className="dms-form-error dms-form-error--inline">{String((errors as any).problem?.message ?? '')}</span> : null}</span>
						<textarea className="dms-form-input dms-form-textarea" {...register('problem', { required: 'กรุณากรอกรายละเอียดปัญหา' })} />
					</label>
				</div>

				<section className="dms-pm-create-section">
					<div className="dms-pm-create-grid">
						<label className="dms-form-field">
							<span className="dms-form-label">ประเภทปัญหา</span>
							<select className="dms-form-input" {...register('problemType')}>
								<option value="">เลือก</option>
								{CM_PROBLEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
						</label>

						<label className="dms-form-field">
							<span className="dms-form-label">ระดับความเร่งด่วน</span>
							<select className="dms-form-input" {...register('priority')}>
								{CM_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
							</select>
						</label>

						<label className="dms-form-field">
							<span className="dms-form-label">สถานะ</span>
							<select className="dms-form-input" {...register('status')}>
								{CM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
							</select>
						</label>
					</div>
				</section>

				<section className="dms-pm-create-section">
					<div className="dms-pm-create-grid">
						<label className="dms-form-field">
							<span className="dms-form-label">วันที่เริ่ม (แผน)</span>
							<input type="date" className="dms-form-input" {...register('plannedStart')} />
						</label>
						<label className="dms-form-field">
							<span className="dms-form-label">วันที่สิ้นสุด (แผน)</span>
							<input type="date" className="dms-form-input" {...register('plannedEnd')} />
						</label>
						<label className="dms-form-field">
							<span className="dms-form-label">ผู้รับผิดชอบ/ทีมงาน</span>
							<input type="text" className="dms-form-input" {...register('responsible')} />
						</label>
					</div>
				</section>

				<section className="dms-pm-create-section">
					<div className="dms-pm-create-grid">
						<label className="dms-form-field">
							<span className="dms-form-label">ประมาณการค่าใช้จ่าย</span>
							<input type="number" className="dms-form-input" {...register('estimatedCost')} />
						</label>
						<label className="dms-form-field dms-form-field--full">
							<span className="dms-form-label">หมายเหตุ</span>
							<textarea className="dms-form-input dms-form-textarea" {...register('notes')} />
						</label>
					</div>
				</section>

				<div className="dms-pm-create-footer">
					<button type="button" className="dms-back-btn" onClick={() => history.back()}>ยกเลิก</button>
					<button type="submit" className="dms-pm-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโครงการ CM'}</button>
				</div>
			</form>
		</section>
	)
}

