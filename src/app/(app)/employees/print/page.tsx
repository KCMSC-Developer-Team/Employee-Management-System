import { PrintButton } from '@/components/PrintButton';
import { Avatar, PageHead, ProfileSheet } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'Print all profiles' };

export default async function PrintAll() {
  await requireRole('authority');
  const rows = await query<{
    id: string;
    name: string;
    designation: string;
    email: string | null;
    has_photo: boolean;
    photo_version: number;
    data: Record<string, string> | null;
  }>(
    `select u.id, u.name, u.designation, u.email, (u.photo is not null) as has_photo, u.photo_version, p.data
       from users u left join profiles p on p.user_id = u.id
      where u.active = true order by u.name`,
  );

  return (
    <>
      <PageHead title="Print all profiles" sub={`${rows.length} profiles · one page each`}>
        <PrintButton label="Print" />
      </PageHead>
      {rows.map((u) => (
        <div className="card print-area page-break" key={u.id}>
          <ProfileSheet
            data={u.data ?? {}}
            onlyFilled
            header={
              <div className="sheet-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" width={56} height={62} />
                <div className="grow">
                  <div className="school">K C MODEL SCHOOL &amp; COLLEGE</div>
                  <div className="doc">Profile and Performance Sheet</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>{u.name}</strong> · {u.designation}{u.email ? ` · ${u.email}` : ''}
                  </div>
                </div>
                <Avatar id={u.id} name={u.name} has={u.has_photo} v={u.photo_version} size={84} />
              </div>
            }
          />
        </div>
      ))}
    </>
  );
}
