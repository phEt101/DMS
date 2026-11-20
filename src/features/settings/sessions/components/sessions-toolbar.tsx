import type { SessionsCopy } from '../sessions-copy'
import type { SessionsFilterOptions } from '../services/sessions.service'

export function SessionsToolbar({
  searchInput,
  departmentId,
  role,
  filterOptions,
  total,
  copy,
  onSearch,
  onDepartment,
  onRole,
}: {
  searchInput: string
  departmentId: string
  role: string
  filterOptions: SessionsFilterOptions
  total: number
  copy: SessionsCopy
  onSearch: (value: string) => void
  onDepartment: (value: string) => void
  onRole: (value: string) => void
}) {
  return (
    <div className="users-toolbar users-filter-toolbar sessions-toolbar">
      <input
        className="users-filter-search"
        type="search"
        value={searchInput}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
      />

      <select
        className="users-filter-department"
        value={departmentId}
        onChange={(event) => onDepartment(event.target.value)}
        aria-label={copy.departmentFilter}
      >
        <option value="all">{copy.allDepartments}</option>
        {filterOptions.departments.map((department) => (
          <option key={department.id} value={String(department.id)}>{department.name}</option>
        ))}
      </select>

      <select
        className="users-filter-role"
        value={role}
        onChange={(event) => onRole(event.target.value)}
        aria-label={copy.roleFilter}
      >
        <option value="all">{copy.allRoles}</option>
        {filterOptions.roles.map((roleName) => (
          <option key={roleName} value={roleName}>{roleName}</option>
        ))}
      </select>

      <span className="users-count sessions-count" role="status">
        {copy.results.replace('{count}', total.toLocaleString())}
      </span>
    </div>
  )
}
