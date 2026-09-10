import React, { useMemo, useRef, useEffect } from 'react';
import type { PermissionModule } from '../../types';

function SelectionCheckbox({ ids, selected, onToggle, label, disabled }: {
  ids: number[];
  selected: number[];
  onToggle: (ids: number[]) => void;
  label: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const count = ids.filter((id) => selected.includes(id)).length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && count < ids.length;
  }, [count, ids.length]);
  return <input ref={ref} type="checkbox" aria-label={label}
    checked={ids.length > 0 && count === ids.length}
    disabled={disabled || ids.length === 0} onChange={() => onToggle(ids)}
    className="h-4 w-4 rounded accent-indigo-600 cursor-pointer disabled:cursor-default" />;
}

export default function PermissionMatrix({ modules, selected, onChange, disabled = false }: {
  modules: PermissionModule[];
  selected: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  // Use action names from the API, including actions beyond CRUD.
  const columns = useMemo(() => [...new Set(modules.flatMap((group) =>
    group.permissions.map((permission) => permission.name)))], [modules]);
  const allIds = modules.flatMap((group) => group.permissions.map((p) => p.id));
  const toggle = (ids: number[]) => {
    if (disabled) return;
    onChange(ids.every((id) => selected.includes(id))
      ? selected.filter((id) => !ids.includes(id))
      : [...new Set([...selected, ...ids])]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">Đã chọn <strong className="text-indigo-600">{selected.length}</strong> / {allIds.length} quyền</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <SelectionCheckbox ids={allIds} selected={selected} onToggle={toggle} label="Chọn tất cả quyền" disabled={disabled} />
          Chọn tất cả
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">Ma trận phân quyền theo nhóm và thao tác</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="p-4 min-w-52">Nhóm quyền</th>
              <th scope="col" className="p-4 text-center">Cả nhóm</th>
              {columns.map((name) => <th scope="col" key={name} className="p-4 text-center whitespace-nowrap">{name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {modules.map((group) => <tr key={group.id} className="hover:bg-slate-50/50">
              <th scope="row" className="p-4 font-medium">
                <div className="text-slate-900">{group.name}</div>
                <div className="text-xs text-slate-500 font-normal mt-1">{group.description}</div>
              </th>
              <td className="p-4 text-center">
                <SelectionCheckbox ids={group.permissions.map((p) => p.id)} selected={selected} onToggle={toggle}
                  label={`Chọn nhóm ${group.name}`} disabled={disabled} />
              </td>
              {columns.map((name) => {
                const permissions = group.permissions.filter((p) => p.name === name);
                return <td key={name} className="p-4 text-center">
                  {permissions.length ? <div className="flex flex-col items-center gap-2">
                    {permissions.map((p) => <label key={p.id} className="flex flex-col items-center gap-1 cursor-pointer" title={p.code}>
                      <SelectionCheckbox ids={[p.id]} selected={selected} onToggle={toggle}
                        label={`${group.name}: ${p.name} (${p.code})`} disabled={disabled} />
                      <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                    </label>)}
                  </div> : <span className="text-slate-300" aria-label="Không có quyền này">—</span>}
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
