import Link from 'next/link';
import { addPeriod, deletePeriod, savePeriods } from '@/actions/routine';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { SECTION_LABELS } from '@/lib/routine';
import type { Period, Section } from '@/lib/types';

export const metadata = { title: 'Periods and times' };

const KINDS = [
  ['form', 'Form class'],
  ['period', 'Period'],
  ['tiffin', 'Tiffin / break'],
] as const;

export default async function PeriodsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireRole('coordinator');
  const sp = await searchParams;
  const section: Section = sp.section === 'senior' ? 'senior' : 'junior';
  const periods = await query<Period>('select * from periods where section = $1 order by position', [section]);

  return (
    <>
      <PageHead title="Periods and times" sub={`${SECTION_LABELS[section]} · times are in Bangladesh time`}>
        <Link className="btn btn-secondary" href={`/routine?section=${section}`}>
          ← Back to routine
        </Link>
      </PageHead>

      <div className="seg">
        {(['junior', 'senior'] as Section[]).map((s) => (
          <Link key={s} href={`/routine/periods?section=${s}`} className={s === section ? 'active' : ''}>
            {SECTION_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="card">
        <ActionForm action={savePeriods.bind(null, section)}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input type="hidden" name="ids" value={p.id} />
                      <input className="input narrow" type="number" name={`pos_${p.id}`} defaultValue={p.position} min={1} aria-label="Order" />
                    </td>
                    <td>
                      <input className="input" name={`label_${p.id}`} defaultValue={p.label} maxLength={40} required />
                    </td>
                    <td>
                      <select className="input" name={`kind_${p.id}`} defaultValue={p.kind}>
                        {KINDS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input className="input" type="time" name={`start_${p.id}`} defaultValue={p.start_time} required />
                    </td>
                    <td>
                      <input className="input" type="time" name={`end_${p.id}`} defaultValue={p.end_time} required />
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16 }}>
            <SubmitButton pendingText="Saving…">Save periods</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Add a period</h2>
        <ActionForm action={addPeriod.bind(null, section)} className="form-grid" resetOnSuccess>
          <div className="field">
            <label htmlFor="label">Name</label>
            <input id="label" name="label" className="input" maxLength={40} placeholder="e.g. Period 7" required />
          </div>
          <div className="field">
            <label htmlFor="kind">Type</label>
            <select id="kind" name="kind" className="input" defaultValue="period">
              {KINDS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="start">Starts</label>
            <input id="start" name="start" type="time" className="input" required />
          </div>
          <div className="field">
            <label htmlFor="end">Ends</label>
            <input id="end" name="end" type="time" className="input" required />
          </div>
          <div className="field wide">
            <SubmitButton pendingText="Adding…">Add period</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Remove a period</h2>
        <p className="muted">Removing a period also removes every class placed in it.</p>
        <div className="stack">
          {periods.map((p) => (
            <ActionForm key={p.id} action={deletePeriod.bind(null, p.id)} confirm={`Remove “${p.label}” and all classes in it?`}>
              <div className="row between">
                <span>{p.label}</span>
                <SubmitButton className="btn btn-danger btn-sm">Remove</SubmitButton>
              </div>
            </ActionForm>
          ))}
        </div>
      </div>
    </>
  );
}
