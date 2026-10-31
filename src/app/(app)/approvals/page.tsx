import { reviewEdit } from '@/actions/profile';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Avatar, EmptyState, fieldLabel, PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { FIELD_BY_KEY } from '@/lib/profile-fields';
import { fmtDate, fmtDateTime } from '@/lib/utils';

export const metadata = { title: 'Approvals' };

export default async function ApprovalsPage() {
  const actor = await requireRole('it', 'authority');
  const edits = await query<{
    id: string;
    user_id: string;
    data: Record<string, string>;
    created_at: string;
    name: string;
    designation: string;
    has_photo: boolean;
    photo_version: number;
    current: Record<string, string> | null;
  }>(
    `select e.id, e.user_id, e.data, e.created_at, u.name, u.designation, (u.photo is not null) as has_photo,
            u.photo_version, p.data as current
       from profile_edits e join users u on u.id = e.user_id left join profiles p on p.user_id = e.user_id
      where e.status = 'pending' and e.user_id <> $1 order by e.created_at`,
    [actor.id],
  );
  const show = (key: string, v: string | undefined) =>
    !v ? '—' : FIELD_BY_KEY[key]?.type === 'date' ? fmtDate(v) : v;

  return (
    <>
      <PageHead title="Approvals" sub={edits.length ? `${edits.length} waiting` : 'Nothing is waiting.'} />
      {edits.length === 0 ? (
        <div className="card">
          <EmptyState title="Your review queue is clear" description="Employee profile changes will appear here when they need review." />
        </div>
      ) : (
        <div className="approval-queue">
          {edits.map((e) => (
            <section className="card approval-item" key={e.id}>
              <header className="approval-item-header">
                <Avatar id={e.user_id} name={e.name} has={e.has_photo} v={e.photo_version} size={44} />
                <div>
                  <strong>{e.name}</strong>
                  <div className="muted small">
                    {e.designation} · sent {fmtDateTime(e.created_at)}
                  </div>
                </div>
                <span className="chip chip-gold approval-pending">Pending review</span>
              </header>
              <div className="table-wrap approval-diff-wrap">
                <table className="table approval-diff-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Now</th>
                      <th>Wants to change to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(e.data).map(([k, v]) => (
                      <tr key={k}>
                        <td>{k === 'designation' ? 'Designation' : fieldLabel(k)}</td>
                        <td className="muted">{show(k, k === 'designation' ? e.designation : e.current?.[k])}</td>
                        <td>
                          <strong>{show(k, v)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ActionForm action={reviewEdit} className="approval-actions">
                <input type="hidden" name="id" value={e.id} />
                <div className="field">
                  <label htmlFor={`note-${e.id}`}>Reason (only needed if you reject)</label>
                  <input id={`note-${e.id}`} name="note" className="input" maxLength={300} />
                </div>
                <div className="row gap approval-buttons">
                  <SubmitButton name="decision" value="approve" pendingText="Please wait…">
                    Approve
                  </SubmitButton>
                  <SubmitButton name="decision" value="reject" className="btn btn-danger" pendingText="Please wait…">
                    Reject
                  </SubmitButton>
                </div>
              </ActionForm>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
