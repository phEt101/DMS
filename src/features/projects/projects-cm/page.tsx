import { useEffect, useMemo, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import { PaginationFooter } from '../../../components/pagination-footer'
import { CM_STATUSES, CmProject, MOCK_CM_PROJECTS } from './mockData'
import { CmFormModal } from './components/cm-form-modal'

function storageKey() { return 'cm_projects_v1' }
function loadStored(): CmProject[] {
	try {
		const raw = localStorage.getItem(storageKey())
		if (!raw) return MOCK_CM_PROJECTS
		return JSON.parse(raw) as CmProject[]
	} catch { return MOCK_CM_PROJECTS }
}
function saveStored(projects: CmProject[]) { try { localStorage.setItem(storageKey(), JSON.stringify(projects)) } catch {} }

export default function CmProjectsPage({ translations, language }: { translations?: any; language?: any }) {
	const [projects, setProjects] = useState<CmProject[]>(() => loadStored())
	const [detailOpen, setDetailOpen] = useState(false)
	const [detailProject, setDetailProject] = useState<CmProject | null>(null)
	const [formOpen, setFormOpen] = useState(false)
	const [editingProject, setEditingProject] = useState<CmProject | null>(null)

	// list controls
	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)

	useEffect(() => { setProjects(loadStored()) }, [])

	const handleDelete = (id: string) => {
		if (!confirm('ลบโครงการนี้?')) return
		const updated = projects.filter((p) => p.id !== id)
		setProjects(updated)
		saveStored(updated)
	}

	const upsertProject = (project: CmProject) => {
		const found = projects.find((p) => p.id === project.id)
		let updated: CmProject[]
		if (found) {
			updated = projects.map((p) => p.id === project.id ? project : p)
		} else {
			updated = [project, ...projects]
		}
		setProjects(updated)
		saveStored(updated)
	}

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase()
		return projects.filter((p) => {
			if (!term) return true
			return (p.name || '').toLowerCase().includes(term) || (p.customer || '').toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term)
		})
	}, [projects, search])

	const total = filtered.length
	const totalPages = Math.max(Math.ceil(total / pageSize), 1)
	const pageSafe = Math.max(1, Math.min(page, totalPages))
	const pageStart = (pageSafe - 1) * pageSize
	const pageItems = filtered.slice(pageStart, pageStart + pageSize)

	useEffect(() => {
		// sync to URL: open detail modal when path is /projects/cm/:id
		const syncFromUrl = () => {
			const m = window.location.pathname.match(/^\/projects\/cm\/(.+)$/)
			if (m) {
				const id = m[1]
				const p = loadStored().find((x) => x.id === id) || null
				setDetailProject(p)
				setDetailOpen(!!p)
			} else {
				setDetailOpen(false)
				setDetailProject(null)
			}
		}
		window.addEventListener('popstate', syncFromUrl)
		syncFromUrl()
		return () => window.removeEventListener('popstate', syncFromUrl)
	}, [])

	return (
		<section className="feature-page">
			<div className="dms-title-row">
				<div className="dms-title-block"><h1>โครงการ CM</h1><div className="dms-subtitle">รายการงานซ่อมและแก้ไข</div></div>
				<div className="dms-title-search-row"><div className="dms-create-actions"><button className="dms-create-btn" onClick={() => { setEditingProject(null); setFormOpen(true) }}>สร้างโครงการ CM</button></div></div>
			</div>

			<div style={{ marginTop: 12 }}>
				<div className="dms-title-search-row">
					<div className="dms-search-wrap">
						<FaMagnifyingGlass className="dms-search-icon" />
						<input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="ค้นหา ชื่อโครงการ / รหัส / ลูกค้า" />
					</div>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<div className="dms-stats-group"><div className="dms-stats-pill">{total} records</div></div>
					</div>
				</div>

				{total === 0 ? (
					<div className="dms-project-empty"><div>ไม่พบโครงการ CM</div></div>
				) : (
					<div className="dms-card-grid">
						{pageItems.map((p) => (
							<article
								key={p.id}
								className={`dms-project-card`}
								role="button"
								tabIndex={0}
								onClick={() => { history.pushState({}, '', `/projects/cm/${p.id}`); window.dispatchEvent(new PopStateEvent('popstate')) }}
								onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); history.pushState({}, '', `/projects/cm/${p.id}`); window.dispatchEvent(new PopStateEvent('popstate')) } }}
							>
								<div className="dms-card-head">
									<div className="dms-project-icon-pill">🔧</div>
									<div className="dms-project-actions">
										<span className={`dms-card-status is-${p.status}`}>{CM_STATUSES.find((s) => s.value === p.status)?.label ?? p.status}</span>
										<div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
											<button className="dms-tool-btn" onClick={(e) => { e.stopPropagation(); setEditingProject(p); setFormOpen(true) }}>แก้ไข</button>
											<button className="dms-tool-btn is-danger" onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}>ลบ</button>
										</div>
									</div>
								</div>
								<h3 className="dms-card-name">{p.name}</h3>
								<div className="dms-card-foot">
									<div>
										<div className="dms-card-meta"><span className="dms-card-date">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''}</span></div>
										<div style={{ marginTop: 6 }}>{p.customer || '-'}</div>
									</div>
									<div className="dms-card-meta">
										<div>{p.code}</div>
										<div style={{ fontSize: 12 }}>{p.responsible || '-'}</div>
									</div>
								</div>
							</article>
						))}
					</div>
				)}

				{total > 0 && (
					<PaginationFooter
						page={pageSafe}
						pageSize={pageSize}
						total={total}
						labels={{ previous: 'Previous', next: 'Next', page: 'Page', perPage: 'per page' }}
						onPageChange={(p: number) => setPage(Math.max(1, Math.min(p, totalPages)))}
						onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }}
					/>
				)}
			</div>

			<CmFormModal open={formOpen} editing={editingProject} onOpenChange={setFormOpen} onSaved={(p) => { upsertProject(p) }} />

			<RadixDialog.Root open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) { history.pushState({}, '', '/projects/cm'); window.dispatchEvent(new PopStateEvent('popstate')) } }}>
				<RadixDialog.Portal>
					<RadixDialog.Overlay className="modal-backdrop" />
					<RadixDialog.Content className="dms-modal dms-create-doc-modal">
						<RadixDialog.Title className="dms-modal-title">รายละเอียดโครงการ CM</RadixDialog.Title>
						<RadixDialog.Close asChild>
							<button className="modal-close" aria-label="Close">×</button>
						</RadixDialog.Close>
						<div className="dms-create-doc-body">
							{detailProject ? (
								<div className="dms-project-view">
									<nav className="dms-project-breadcrumb" aria-label="breadcrumb">
										<button type="button" onClick={() => { setDetailOpen(false); history.pushState({}, '', '/projects/cm'); window.dispatchEvent(new PopStateEvent('popstate')) }}>รายการโครงการ /projects</button>
										<span>/</span>
										<span>{detailProject.name}</span>
									</nav>

									<header className="dms-project-view-header">
										<div>
											<div className="dms-project-view-title-row">
												<h1 style={{ margin: 0 }}>{detailProject.name}</h1>
												<span className={`dms-card-status is-${detailProject.status}`}>{CM_STATUSES.find((s) => s.value === detailProject.status)?.label ?? detailProject.status}</span>
											</div>
											<div className="dms-project-view-tags">
												<span>{detailProject.code}</span>
												<span>{detailProject.requestedDate || '—'} – {detailProject.plannedEnd || '—'}</span>
											</div>
										</div>
										<div style={{ display: 'flex', gap: 8 }}>
											<button className="dms-tool-btn" onClick={() => { setEditingProject(detailProject); setFormOpen(true) }}>แก้ไข</button>
											<button className="dms-tool-btn is-danger" onClick={() => handleDelete(detailProject.id)}>ลบ</button>
										</div>
									</header>

									<div className="dms-project-overview-grid">
										<div className="dms-project-view-card is-wide">
											<h2>ข้อมูลโครงการ</h2>
											<dl className="dms-project-summary">
												<div>
													<dt>ผู้รับผิดชอบ</dt>
													<dd>{detailProject.responsible || '—'}</dd>
												</div>
												<div>
													<dt>ลูกค้า</dt>
													<dd>{detailProject.customer || '—'}</dd>
												</div>
												<div>
													<dt>แก้ไขล่าสุด</dt>
													<dd>{detailProject.updatedAt}</dd>
												</div>
												<div>
													<dt>หมายเหตุ</dt>
													<dd>{detailProject.notes || '—'}</dd>
												</div>
											</dl>
										</div>
										<div className="dms-project-view-card">
											<h2>สถานที่</h2>
											<p>{detailProject.location || '—'}</p>
										</div>
										<div className="dms-project-view-card is-wide">
											<h2>รายละเอียดปัญหา</h2>
											<p style={{ whiteSpace: 'pre-wrap' }}>{detailProject.problem || '—'}</p>
										</div>
									</div>
								</div>
							) : <div>Loading...</div>}
						</div>
					</RadixDialog.Content>
				</RadixDialog.Portal>
			</RadixDialog.Root>
		</section>
	)
}
