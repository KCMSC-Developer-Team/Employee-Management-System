import { submitProfile } from '@/actions/profile';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Avatar, FieldInput, PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { GROUPS } from '@/lib/profile-fields';
import { fmtDate, fmtDateTime } from '@/lib/utils';

export const metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, pending, lastReview] = await Promise.all([
    one<{ data: Record<string, string> }>('select data from profiles where user_id = $1', [user.id]),
    one<{ data: Record<string, string>; created_at: string }>(
      `select data, created_at from profile_edits where user_id = $1 and status = 'pending' order by created_at desc limit 1`,
      [user.id],
    ),
    one<{ status: string; review_note: string | null; reviewed_at: string }>(
      `select status, review_note, reviewed_at from profile_edits where user_id = $1 and status <> 'pending' order by reviewed_at desc limit 1`,
      [user.id],
    ),
  ]);
  const data = profile?.data ?? {};
  // show what the person last submitted while it is waiting, so they do not think it was lost
  const shown = { ...data, ...(pending?.data ?? {}) };

  return (
    <>
      <PageHead title="My profile" sub="Your Profile and Performance Sheet" />

      <div className="card profile-head profile-overview">
        <Avatar id={user.id} name={user.name} has={user.has_photo} v={user.photo_version} size={96} />
        <div className="grow">
          <h2 style={{ margin: 0 }}>{user.name}</h2>
          <p className="muted" style={{ margin: '2px 0 10px' }}>
            {user.designation}{user.email ? ` · ${user.email}` : ''}
          </p>
          <PhotoUploader hasPhoto={user.has_photo} />
        </div>
      </div>

      {pending && (
        <div className="alert alert-warn" style={{ marginTop: 16 }}>
          <strong>Waiting for approval.</strong> You sent changes on {fmtDateTime(pending.created_at)}. They will appear in your official profile after a Developer, IT Technician or Authority approves them.
        </div>
      )}
      {!pending && lastReview?.status === 'rejected' && (
        <div className="alert alert-err" style={{ marginTop: 16 }}>
          <strong>Your last changes were rejected.</strong> {lastReview.review_note ? `Reason: ${lastReview.review_note}` : 'Please check and submit again.'}
        </div>
      )}

      <ActionForm action={submitProfile} className="stack" >
        {GROUPS.map((g) => {
          const editable = g.fields.filter((f) => !f.admin);
          const managed = g.fields.filter((f) => f.admin);
          return (
            <section key={g.id} className="card profile-section">
              <header className="profile-section-header"><p className="eyebrow">Profile information</p><h2>{g.title}</h2></header>
              {editable.length > 0 && (
                <div className="form-grid">
                  {editable.map((f) => (
                    <FieldInput key={f.key} field={f} value={shown[f.key]} />
                  ))}
                </div>
              )}
              {managed.length > 0 && (
                <>
                  <h3 className="sub">Managed by administration</h3>
                  <dl className="kv">
                    {managed.map((f) => (
                      <div key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>{f.type === 'date' ? fmtDate(data[f.key]) : data[f.key] || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </section>
          );
        })}
        <div className="sticky-actions">
          <SubmitButton pendingText="Sending…">Submit changes</SubmitButton>
          <span className="muted small">Changes need approval before they appear in your official profile.</span>
        </div>
      </ActionForm>
    </>
  );
}
