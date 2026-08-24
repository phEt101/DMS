import { useState } from 'react'
import type { UserFeatureCopy } from '../../../types/localization'
import { DepartmentsTab } from './components/departments-tab'
import { PermissionsTab } from './components/permissions-tab'
import { RolesTab } from './components/roles-tab'
import { UsersTab } from './components/users-tab'

type Tab = 'users' | 'roles' | 'departments' | 'permissions'

export default function SettingsUserPage({ t }: { t: UserFeatureCopy }) {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <section className="feature-page feature-page--wide users-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker">{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <div className="users-tabs" role="tablist">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>{t.userTab}</TabButton>
        <TabButton active={tab === 'roles'} onClick={() => setTab('roles')}>{t.roleTab}</TabButton>
        <TabButton active={tab === 'departments'} onClick={() => setTab('departments')}>{t.departmentTab}</TabButton>
        <TabButton active={tab === 'permissions'} onClick={() => setTab('permissions')}>{t.permissionTab}</TabButton>
      </div>

      {tab === 'users' && <UsersTab t={t} />}
      {tab === 'roles' && <RolesTab t={t} />}
      {tab === 'departments' && <DepartmentsTab t={t} />}
      {tab === 'permissions' && <PermissionsTab t={t} />}
    </section>
  )
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button className={active ? 'is-active' : ''} type="button" role="tab" aria-selected={active} onClick={onClick}>
      {children}
    </button>
  )
}
