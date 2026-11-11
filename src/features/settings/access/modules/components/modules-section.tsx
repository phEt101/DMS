import { type DragEvent, type SyntheticEvent, useCallback, useEffect, useState } from "react";
import { FaGripVertical } from "react-icons/fa6";
import type { Translations } from "../../../../../locales";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasPermission } from "../../../../auth/permissions";
import {
  createPermissionModule,
  deletePermissionModule,
  listPermissionModules,
  reorderPermissionModules,
  updatePermissionModule,
  type PermissionModule,
  type PermissionModuleInput,
} from "../services/modules.service";
import { moduleLabels, permissionModuleGroupDefinitions } from "../module-groups";
import { getModuleIcon, moduleIconComponents, moduleIconOptions } from "../module-icons";

const emptyForm: PermissionModuleInput = {
  name: "",
  iconName: "FaLayerGroup",
  sortOrder: 0,
  isActive: true,
};

export function ModulesSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasPermission(user, "เพิ่มโมดูล"));
  const canEdit = Boolean(user && hasPermission(user, "แก้ไขโมดูล"));
  const canDelete = Boolean(user && hasPermission(user, "ลบโมดูล"));
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [editing, setEditing] = useState<PermissionModule | null>(null);
  const [form, setForm] = useState<PermissionModuleInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  useErrorToast(error);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [displayOrderOpen, setDisplayOrderOpen] = useState(false);
  const [displaySearch, setDisplaySearch] = useState("");
  const [draggedModuleId, setDraggedModuleId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ moduleId: number; position: "before" | "after" } | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const modulePositions = new Map(modules.map((module, index) => [module.id, index + 1]));
  const filteredModules = modules.filter((module) => {
    const displayName = settingsTranslations.permissionModules[module.name as keyof typeof settingsTranslations.permissionModules] ?? module.name;
    const matchesSearch = !normalizedSearch || module.name.toLocaleLowerCase().includes(normalizedSearch) || displayName.toLocaleLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || Boolean(module.isActive) === (statusFilter === "active");
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(Math.ceil(filteredModules.length / pageSize), 1);
  const visibleModules = filteredModules.slice((page - 1) * pageSize, page * pageSize);
  const moduleDisplayName = (module: PermissionModule) =>
    settingsTranslations.permissionModules[module.name as keyof typeof settingsTranslations.permissionModules] ?? moduleLabels[module.name] ?? module.name;
  const knownModuleNames = new Set(permissionModuleGroupDefinitions.flatMap((group) => group.keys));
  const ungroupedModules = modules.filter((module) => !knownModuleNames.has(module.name));
  const displayGroups: Array<{ label: string; keys: readonly string[] }> = [
    ...permissionModuleGroupDefinitions.map((group) => ({
      label: settingsTranslations[group.labelKey],
      keys: group.keys,
    })),
    ...(ungroupedModules.length
      ? [{ label: settingsTranslations.otherModules, keys: ungroupedModules.map((module) => module.name) }]
      : []),
  ];
  const normalizedDisplaySearch = displaySearch.trim().toLocaleLowerCase();
  const visibleDisplayGroups = displayGroups.flatMap((group) => {
    const groupModules = modules.filter((module) => group.keys.includes(module.name));
    const matchingModules = groupModules.filter((module) => {
      const name = moduleDisplayName(module).toLocaleLowerCase();
      return !normalizedDisplaySearch ||
        name.includes(normalizedDisplaySearch) ||
        module.name.toLocaleLowerCase().includes(normalizedDisplaySearch);
    });
    return matchingModules.length ? [{ group, modules: matchingModules }] : [];
  });
  const visibleDisplayModuleCount = visibleDisplayGroups.reduce((count, group) => count + group.modules.length, 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setModules((await listPermissionModules()).data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
    } finally {
      setLoading(false);
    }
  }, [settingsTranslations.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function showForm(module?: PermissionModule) {
    setEditing(module ?? null);
    setForm(
      module
        ? {
            name: module.name,
            iconName: module.iconName || "FaLayerGroup",
            sortOrder: module.sortOrder,
            isActive: Boolean(module.isActive),
          }
        : {
            ...emptyForm,
            sortOrder: modules.reduce((highest, candidate) => Math.max(highest, candidate.sortOrder), 0) + 10,
          },
    );
    setError("");
    setOpen(true);
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updatePermissionModule(editing.id, {
          name: form.name,
          iconName: form.iconName,
          isActive: form.isActive,
        });
      }
      else await createPermissionModule(form);
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function toggleModule(module: PermissionModule) {
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await updatePermissionModule(module.id, { isActive: !Boolean(module.isActive) });
      setModules((current) => current.map((item) => item.id === module.id ? data : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  function getDropPosition(event: DragEvent<HTMLElement>): "before" | "after" {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
  }

  function handleModuleDragStart(event: DragEvent<HTMLElement>, moduleId: number) {
    if (!canEdit || loading || saving) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(moduleId));
    setDraggedModuleId(moduleId);
  }

  function handleModuleDragOver(event: DragEvent<HTMLElement>, moduleId: number) {
    if (!canEdit || draggedModuleId === null || draggedModuleId === moduleId || saving) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const position = getDropPosition(event);
    setDropTarget((current) => current?.moduleId === moduleId && current.position === position
      ? current
      : { moduleId, position });
  }

  async function handleModuleDrop(event: DragEvent<HTMLElement>, targetModuleId: number) {
    event.preventDefault();
    const sourceModuleId = Number(event.dataTransfer.getData("text/plain")) || draggedModuleId;
    const position = getDropPosition(event);
    setDraggedModuleId(null);
    setDropTarget(null);
    if (sourceModuleId === null || sourceModuleId === targetModuleId || !canEdit || saving) return;
    const sourceIndex = modules.findIndex((module) => module.id === sourceModuleId);
    if (sourceIndex < 0) return;
    const nextOrder = [...modules];
    const [module] = nextOrder.splice(sourceIndex, 1);
    if (!module) return;
    const targetIndex = nextOrder.findIndex((candidate) => candidate.id === targetModuleId);
    if (targetIndex < 0) return;
    nextOrder.splice(targetIndex + (position === "after" ? 1 : 0), 0, module);
    if (nextOrder.every((candidate, index) => candidate.id === modules[index]?.id)) return;
    setSaving(true);
    setError("");
    try {
      await reorderPermissionModules(nextOrder.map((candidate) => candidate.id));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(module: PermissionModule) {
    if (!window.confirm(`${settingsTranslations.deleteConfirm} “${module.name}” ?`)) return;
    try {
      await deletePermissionModule(module.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.moduleManagement}</h1>
          <p>{settingsTranslations.moduleHelp}</p>
          {canEdit && <p className="module-order-help">{settingsTranslations.moduleOrderHelp}</p>}
        </div>
        {(canCreate || canEdit) && <div className="management-header-actions">
          {canEdit && <button
            className="secondary-button"
            type="button"
            disabled={loading || saving}
            onClick={() => {
              setDisplaySearch("");
              setDisplayOrderOpen(true);
            }}
          >
            {settingsTranslations.manageModuleDisplay}
          </button>}
          {canCreate && <button
            className="primary-button"
            type="button"
            onClick={() => showForm()}
          >
            {settingsTranslations.addModule}
          </button>}
        </div>}
      </header>
      <div className="users-toolbar">
        <input
          type="search"
          aria-label={settingsTranslations.moduleSearchPlaceholder}
          placeholder={settingsTranslations.moduleSearchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label={settingsTranslations.statusFilter} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{settingsTranslations.allStatuses}</option>
          <option value="active">{settingsTranslations.active}</option>
          <option value="inactive">{settingsTranslations.inactive}</option>
        </select>
        <span className="users-count">{filteredModules.length} {settingsTranslations.module}</span>
      </div>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.name}</th>
              <th>{settingsTranslations.sortOrder}</th>
              <th>{settingsTranslations.permissionsCount}</th>
              <th>{settingsTranslations.status}</th>
              <th>{settingsTranslations.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.loading}
                </td>
              </tr>
            ) : filteredModules.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.noModules}
                </td>
              </tr>
            ) : (
              visibleModules.map((module) => {
                const ModuleIcon = getModuleIcon(module.iconName);
                const moduleName = moduleDisplayName(module);
                return <tr
                  key={module.id}
                >
                  <td
                    data-label={settingsTranslations.name}
                  >
                    <ModuleIcon className="module-list-icon" aria-hidden="true" />
                    <strong>{moduleName}</strong>
                  </td>
                  <td data-label={settingsTranslations.sortOrder}>
                    {modulePositions.get(module.id) ?? 0}
                  </td>
                  <td data-label={settingsTranslations.permissionsCount}>
                    {module.permissionCount}
                  </td>
                  <td data-label={settingsTranslations.status}>
                    <span
                      className={`status-pill ${module.isActive ? "is-active" : ""}`}
                    >
                      {module.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                    </span>
                  </td>
                  <td data-label={settingsTranslations.actions}>
                    <div className="row-actions">
                      {canEdit && <button type="button" onClick={() => showForm(module)}>
                        {translations.common.actions.edit}
                      </button>}
                      {canDelete && <button
                        className="danger-link"
                        type="button"
                        disabled={module.permissionCount > 0}
                        onClick={() => void remove(module)}
                      >
                        {translations.common.actions.delete}
                      </button>}
                    </div>
                  </td>
                </tr>
              })
            )}
          </tbody>
        </table>
      </div>
      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={filteredModules.length}
        labels={translations.common.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true">
            <header>
              <h2>{editing ? settingsTranslations.editModule : settingsTranslations.addModule}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void submit(event)}>
              <div className="form-grid">
                <label>
                  {settingsTranslations.name}
                  <input
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value.toLowerCase(),
                      })
                    }
                  />
                </label>
              </div>
              <fieldset className="module-icon-picker">
                <legend>{settingsTranslations.iconName}</legend>
                <div className="module-icon-picker-grid">
                  {form.iconName && !moduleIconComponents[form.iconName] && (
                    <label className="module-icon-option is-selected">
                      <input type="radio" name="module-icon" value={form.iconName} checked readOnly />
                      {(() => {
                        const ModuleIcon = getModuleIcon(form.iconName);
                        return <ModuleIcon aria-hidden="true" />;
                      })()}
                      <span>{form.iconName}</span>
                    </label>
                  )}
                  {moduleIconOptions.map(({ name, Icon }) => (
                    <label className={`module-icon-option${form.iconName === name ? " is-selected" : ""}`} key={name}>
                      <input
                        type="radio"
                        name="module-icon"
                        value={name}
                        checked={form.iconName === name}
                        onChange={() => setForm({ ...form, iconName: name })}
                      />
                      <Icon aria-hidden="true" />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                {settingsTranslations.active}
              </label>
              <footer>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  {translations.common.actions.cancel}
                </button>
                <button
                  className="primary-button"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? settingsTranslations.saving : translations.common.actions.save}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {displayOrderOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDisplayOrderOpen(false);
          }}
        >
          <section className="user-modal department-modal module-display-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>{settingsTranslations.manageModuleDisplay}</h2>
                <p className="module-display-subtitle">{settingsTranslations.moduleDisplayOverviewHelp}</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label={settingsTranslations.closeModuleDisplay}
                onClick={() => setDisplayOrderOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="module-display-content">
              <div className="module-display-toolbar">
                <input
                  type="search"
                  aria-label={settingsTranslations.moduleSearchPlaceholder}
                  placeholder={settingsTranslations.moduleSearchPlaceholder}
                  value={displaySearch}
                  onChange={(event) => setDisplaySearch(event.target.value)}
                />
                <span>{visibleDisplayModuleCount}/{modules.length} {settingsTranslations.module}</span>
              </div>
              <div className="role-permission-picker-grid module-display-grid">
                {visibleDisplayGroups.map(({ group, modules: groupModules }) => (
                  <section className="role-permission-picker-module" key={group.label}>
                    <div className="permission-picker-module-header module-display-group-header">
                      <h3>{group.label}</h3>
                      <small>{groupModules.length}</small>
                    </div>
                    {groupModules.map((module) => {
                      const ModuleIcon = getModuleIcon(module.iconName);
                      return <div
                        key={module.id}
                        className={`module-display-row ${
                          draggedModuleId === module.id
                            ? "module-row-dragging"
                            : dropTarget?.moduleId === module.id
                              ? `module-row-drop-${dropTarget.position}`
                              : ""
                        }`}
                        onDragOver={(event) => handleModuleDragOver(event, module.id)}
                        onDrop={(event) => void handleModuleDrop(event, module.id)}
                      >
                        <div className="module-display-option">
                          <div
                            className="module-display-drag-handle"
                            draggable={canEdit && !loading && !saving}
                            title={settingsTranslations.dragMenuToReorder}
                            onDragStart={(event) => handleModuleDragStart(event, module.id)}
                            onDragEnd={() => {
                              setDraggedModuleId(null);
                              setDropTarget(null);
                            }}
                          >
                            <FaGripVertical className="module-display-grip" aria-hidden="true" />
                            <ModuleIcon aria-hidden="true" />
                            <span>{moduleDisplayName(module)}</span>
                          </div>
                          <span className="module-display-order">{modulePositions.get(module.id) ?? 0}</span>
                          <span className={`status-pill ${module.isActive ? "is-active" : ""}`}>
                            {module.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                          </span>
                          <button
                            type="button"
                            className={`module-display-toggle${module.isActive ? " is-active" : ""}`}
                            role="switch"
                            aria-checked={Boolean(module.isActive)}
                            aria-label={`${moduleDisplayName(module)} — ${settingsTranslations.moduleDisplayToggle}`}
                            title={module.isActive ? settingsTranslations.deactivateModule : settingsTranslations.activateModule}
                            disabled={!canEdit || saving}
                            onClick={() => void toggleModule(module)}
                          >
                            <span aria-hidden="true" />
                          </button>
                        </div>
                      </div>;
                    })}
                  </section>
                ))}
                {visibleDisplayGroups.length === 0 && <p className="permission-search-empty">{settingsTranslations.noModules}</p>}
              </div>
              <footer className="module-display-footer">
                <button className="secondary-button" type="button" onClick={() => setDisplayOrderOpen(false)}>
                  {settingsTranslations.closeModuleDisplay}
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
