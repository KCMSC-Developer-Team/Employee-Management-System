'use client';

import { useMemo, useState, useTransition } from 'react';
import Papa from 'papaparse';
import { importUsers, type ImportResult, type ImportRow } from '@/actions/users';
import { ROLE_LABELS } from '@/lib/roles';
import { isEmail } from '@/lib/utils';
import type { Role } from '@/lib/types';

type FieldKey = 'name' | 'email' | 'designation' | 'roles' | 'mobile' | 'id_no' | 'position' | 'dept' | 'date_of_joining' | 'supervisor';

const FIELDS: { key: FieldKey; label: string; required?: boolean; hint?: string }[] = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'email', label: 'E-mail' },
  { key: 'designation', label: 'Designation', hint: 'or set one default below' },
  { key: 'roles', label: 'Role(s)', hint: 'or tick default roles below' },
  { key: 'mobile', label: 'Mobile number' },
  { key: 'id_no', label: 'ID No.' },
  { key: 'position', label: 'Position' },
  { key: 'dept', label: 'Subject / Admin dept.' },
  { key: 'date_of_joining', label: 'Date of joining' },
  { key: 'supervisor', label: 'Supervisor' },
];

const SYNONYMS: Record<FieldKey, string[]> = {
  name: ['full name', 'fullname', 'name', 'employee name', 'name in english', 'name english', 'teacher name', 'staff name'],
  email: ['email', 'e mail', 'email address', 'e mail address', 'mail'],
  designation: ['designation', 'post', 'job title', 'title'],
  roles: ['role', 'roles', 'user role', 'access'],
  mobile: ['mobile', 'mobile number', 'mobile no', 'phone', 'phone number', 'contact', 'contact number', 'cell'],
  id_no: ['id', 'id no', 'employee id', 'emp id', 'staff id'],
  position: ['position', 'rank', 'grade'],
  dept: ['subject', 'department', 'dept', 'subject admin dept', 'subject admin department'],
  date_of_joining: ['date of joining', 'joining date', 'date joined', 'joined', 'doj', 'join date'],
  supervisor: ['supervisor', 'reporting to', 'manager'],
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function guessMapping(headers: string[]): Record<FieldKey, number> {
  const used = new Set<number>();
  const map = {} as Record<FieldKey, number>;
  const norm = headers.map(normalise);
  for (const f of FIELDS) {
    let idx = norm.findIndex((h, i) => !used.has(i) && SYNONYMS[f.key].includes(h));
    if (idx < 0 && f.key === 'email') idx = norm.findIndex((h, i) => !used.has(i) && h.includes('mail'));
    if (idx < 0 && f.key === 'mobile') idx = norm.findIndex((h, i) => !used.has(i) && (h.includes('phone') || h.includes('mobile')));
    if (idx < 0 && f.key === 'designation') idx = norm.findIndex((h, i) => !used.has(i) && h.includes('designation'));
    if (idx < 0 && f.key === 'roles') idx = norm.findIndex((h, i) => !used.has(i) && h.includes('role'));
    map[f.key] = idx;
    if (idx >= 0) used.add(idx);
  }
  return map;
}

function parseRoles(text: string, allowed: Role[]): { roles: Role[]; warnings: string[] } {
  const roles = new Set<Role>();
  const warnings: string[] = [];
  for (const raw of text.split(/[,;/|&+]| and /i).map((t) => t.trim().toLowerCase()).filter(Boolean)) {
    let r: Role | null = null;
    if (raw.includes('developer')) r = 'developer';
    else if (raw === 'it' || raw.includes('technician')) r = 'it';
    else if (raw.includes('author')) r = 'authority';
    else if (raw.includes('routine') || raw.includes('coordinator')) r = 'coordinator';
    else if (raw.includes('mentor') || raw.includes('teacher')) r = 'mentor';
    if (!r) warnings.push(`unknown role “${raw}”`);
    else if (!allowed.includes(r)) warnings.push(`you cannot assign “${ROLE_LABELS[r]}”`);
    else roles.add(r);
  }
  return { roles: Array.from(roles), warnings };
}

export function ImportWizard({ assignable }: { assignable: Role[] }) {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number> | null>(null);
  const [defaultDesignation, setDefaultDesignation] = useState('');
  const [defaultRoles, setDefaultRoles] = useState<Role[]>(['mentor']);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setError('');
    setResult(null);
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      let table: string[][];
      if (ext === 'csv') {
        table = await new Promise<string[][]>((resolve, reject) =>
          Papa.parse<string[]>(file, {
            skipEmptyLines: true,
            complete: (r) => resolve((r.data as unknown[][]).map((row) => row.map((c) => String(c ?? '').trim()))),
            error: reject,
          }),
        );
      } else if (ext === 'xlsx') {
        const readXlsxFile = (await import('read-excel-file')).default;
        const data = await readXlsxFile(file);
        table = data.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c == null ? '' : String(c).trim())));
      } else {
        throw new Error('Please choose an .xlsx or .csv file. (Save older .xls files as .xlsx first.)');
      }
      table = table.filter((r) => r.some((c) => c !== ''));
      if (table.length < 2) throw new Error('The file needs a heading row and at least one person below it.');
      const hdr = table[0].map((h, i) => h || `Column ${i + 1}`);
      setFileName(file.name);
      setHeaders(hdr);
      setRows(table.slice(1));
      setMapping(guessMapping(hdr));
    } catch (e) {
      setMapping(null);
      setHeaders([]);
      setRows([]);
      setError(e instanceof Error ? e.message : 'The file could not be read.');
    }
  }

  const built = useMemo(() => {
    if (!mapping) return [];
    const seen = new Set<string>();
    return rows.map((r, i) => {
      const get = (k: FieldKey) => (mapping[k] >= 0 ? (r[mapping[k]] ?? '').trim() : '');
      const email = get('email').toLowerCase();
      const designation = get('designation') || (mapping.designation < 0 ? defaultDesignation.trim() : '');
      let roles: Role[] = defaultRoles.filter((x) => assignable.includes(x));
      const warnings: string[] = [];
      if (mapping.roles >= 0) {
        const p = parseRoles(get('roles'), assignable);
        roles = p.roles;
        warnings.push(...p.warnings);
      }
      const problems: string[] = [];
      if (!get('name')) problems.push('name is empty');
      if (email && !isEmail(email)) problems.push('e-mail is not valid');
      else if (email && seen.has(`email:${email}`)) problems.push('e-mail is repeated in the file');
      if (email) seen.add(`email:${email}`);
      if (!get('id_no')) problems.push('ID number is empty');
      else if (seen.has(`id:${get('id_no')}`)) problems.push('ID number is repeated in the file');
      if (get('id_no')) seen.add(`id:${get('id_no')}`);
      if (!designation) problems.push('designation is empty');
      if (roles.length === 0) problems.push('no role');
      const row: ImportRow = {
        name: get('name'),
        email,
        designation,
        roles,
        mobile: get('mobile'),
        id_no: get('id_no'),
        position: get('position'),
        dept: get('dept'),
        date_of_joining: get('date_of_joining'),
        supervisor: get('supervisor'),
      };
      return { line: i + 2, row, problems, warnings };
    });
  }, [rows, mapping, defaultDesignation, defaultRoles, assignable]);

  const ready = built.filter((b) => b.problems.length === 0);
  const bad = built.filter((b) => b.problems.length > 0);
  const missing = mapping ? FIELDS.filter((f) => f.required && mapping[f.key] < 0).map((f) => f.label) : [];

  const importedAs = (colIndex: number) => {
    if (!mapping) return null;
    const f = FIELDS.find((x) => mapping[x.key] === colIndex);
    return f ? f.label : null;
  };

  function run() {
    start(async () => {
      const r = await importUsers(ready.map((b) => b.row));
      setResult(r);
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>1. Choose your file</h2>
        <p className="muted">An Excel (.xlsx) or CSV file. The first row must be the column headings.</p>
        <input type="file" accept=".xlsx,.csv" onChange={(e) => onFile(e.target.files?.[0])} />
        {error && <div className="alert alert-err" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {mapping && !result && (
        <>
          <div className="card">
            <h2>2. Match the columns</h2>
            <p className="muted">
              For each option, choose which column of <strong>{fileName}</strong> holds that information. We guessed for you — please check.
            </p>
            <div className="map-grid">
              {FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label htmlFor={`map-${f.key}`}>
                    Import as <strong>{f.label}</strong>
                    {f.required && <span className="req"> *</span>}
                    {f.hint && <span className="muted small"> ({f.hint})</span>}
                  </label>
                  <select
                    id={`map-${f.key}`}
                    className="input"
                    value={mapping[f.key]}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                  >
                    <option value={-1}>— not in my file —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {(mapping.designation < 0 || mapping.roles < 0) && (
              <div className="defaults">
                {mapping.designation < 0 && (
                  <div className="field">
                    <label htmlFor="def-des">Default designation for everyone</label>
                    <input id="def-des" className="input" value={defaultDesignation} onChange={(e) => setDefaultDesignation(e.target.value)} placeholder="e.g. Assistant Teacher" />
                  </div>
                )}
                {mapping.roles < 0 && (
                  <div className="field">
                    <label>Default roles for everyone</label>
                    <div className="checks">
                      {assignable.map((r) => (
                        <label key={r} className="check">
                          <input
                            type="checkbox"
                            checked={defaultRoles.includes(r)}
                            onChange={(e) => setDefaultRoles(e.target.checked ? [...defaultRoles, r] : defaultRoles.filter((x) => x !== r))}
                          />
                          {ROLE_LABELS[r]}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {missing.length > 0 && <div className="alert alert-err">Still needed: {missing.join(', ')}.</div>}
          </div>

          <div className="card">
            <h2>3. Preview</h2>
            <p className="muted">
              The first rows of your file. The green label above each column shows what it will be imported as.
            </p>
            <div className="table-wrap">
              <table className="table preview">
                <thead>
                  <tr>
                    {headers.map((h, i) => {
                      const as = importedAs(i);
                      return (
                        <th key={i}>
                          <span className={`chip ${as ? 'chip-green' : 'chip-grey'}`}>{as ? `→ ${as}` : 'Not imported'}</span>
                          <div>{h}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, ri) => (
                    <tr key={ri}>
                      {headers.map((_, ci) => (
                        <td key={ci} className={importedAs(ci) ? '' : 'dim'}>
                          {r[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 8 && <p className="muted small">Showing 8 of {rows.length} rows.</p>}
          </div>

          <div className="card">
            <h2>4. Check and import</h2>
            <p>
              <strong>{ready.length}</strong> ready to import · <strong>{bad.length}</strong> with a problem (these are skipped).
            </p>
            {bad.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Name</th>
                      <th>E-mail</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bad.slice(0, 25).map((b) => (
                      <tr key={b.line}>
                        <td>{b.line}</td>
                        <td>{b.row.name || '—'}</td>
                        <td>{b.row.email || '—'}</td>
                        <td className="text-red">{b.problems.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {built.some((b) => b.warnings.length > 0) && (
              <p className="muted small">
                Note: {built.filter((b) => b.warnings.length > 0).length} row(s) mention a role that was ignored (for example “{built.find((b) => b.warnings.length)?.warnings[0]}”).
              </p>
            )}
            <button className="btn" type="button" disabled={pending || ready.length === 0 || missing.length > 0} onClick={run}>
              {pending ? 'Importing…' : `Import ${ready.length} account(s)`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="card">
          <h2>Import finished</h2>
          <div className={`alert ${result.ok ? 'alert-ok' : 'alert-err'}`}>{result.message}</div>
          {result.emailError && (
            <div className="alert alert-err" style={{ marginTop: 12 }}>
              The invitation e-mails could not be sent ({result.emailError}). Check your Resend settings, then use “Send set-password link” on each employee’s page.
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>E-mail</th>
                    <th>Why skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((s, i) => (
                    <tr key={i}>
                      <td>{s.line}</td>
                      <td>{s.email || '—'}</td>
                      <td>{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 16 }}>
            <a className="btn btn-secondary" href="/employees">
              Go to employee list
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
