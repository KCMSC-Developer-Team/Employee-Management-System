import type { ReactNode } from 'react';
import { FIELD_BY_KEY, GROUPS, type Field } from '@/lib/profile-fields';
import { fmtDate } from '@/lib/utils';

export function Avatar({
  id,
  name,
  has,
  v = 0,
  size = 40,
}: {
  id: string;
  name: string;
  has: boolean;
  v?: number;
  size?: number;
}) {
  if (has) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="avatar" src={`/api/photo/${id}?v=${v}`} alt={name} width={size} height={size} style={{ width: size, height: size }} />
    );
  }
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-label={name}>
      {ini}
    </span>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="row gap">{children}</div>}
    </div>
  );
}

/** One input, uncontrolled — used by the profile form and admin form. */
export function FieldInput({ field, value }: { field: Field; value?: string }) {
  const common = { name: field.key, id: field.key, defaultValue: value ?? '' };
  return (
    <div className={`field ${field.wide ? 'wide' : ''}`}>
      <label htmlFor={field.key}>{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea className="input" rows={2} {...common} />
      ) : field.type === 'select' ? (
        <select className="input" {...common}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input className="input" type={field.type === 'date' ? 'date' : 'text'} {...common} />
      )}
    </div>
  );
}

/** Read-only sheet: all groups and fields of the Profile and Performance Sheet. */
export function ProfileSheet({
  data,
  header,
  onlyFilled = false,
}: {
  data: Record<string, string>;
  header?: ReactNode;
  onlyFilled?: boolean;
}) {
  return (
    <div className="sheet">
      {header}
      {GROUPS.map((g) => {
        const fields = g.fields.filter((f) => !onlyFilled || data[f.key]);
        if (fields.length === 0) return null;
        return (
          <section key={g.id} className="sheet-group">
            <h3>{g.title}</h3>
            <dl className="kv">
              {fields.map((f) => (
                <div key={f.key} className={f.wide ? 'wide' : ''}>
                  <dt>{f.label}</dt>
                  <dd>{f.type === 'date' ? fmtDate(data[f.key]) : data[f.key] || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

export const fieldLabel = (key: string) => FIELD_BY_KEY[key]?.label ?? key;
