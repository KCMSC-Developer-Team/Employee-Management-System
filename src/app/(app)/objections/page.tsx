import { EmptyState, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "My objections" };

export default async function ObjectionsPage() {
  const user = await requireUser();
  const rows = await query<{
    id: string;
    subject: string;
    body: string;
    created_at: string;
    read_at: string | null;
    author: string | null;
  }>(
    `select o.id, o.subject, o.body, o.created_at, o.read_at, a.name as author
       from objections o left join users a on a.id = o.author_id
      where o.user_id = $1 order by o.created_at desc`,
    [user.id],
  );
  // opening this page counts as reading them
  await query(
    "update objections set read_at = now() where user_id = $1 and read_at is null",
    [user.id],
  );

  return (
    <>
      <PageHead
        title="My objections"
        sub="Only you and the Developer can see these."
      />
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No objections on file"
            description="If an Authority adds an objection for you, it will appear here."
          />
        </div>
      ) : (
        <div className="stack">
          {rows.map((o) => (
            <article className="card" key={o.id}>
              <div className="row between">
                <h2 style={{ margin: 0 }}>{o.subject}</h2>
                {!o.read_at && <span className="chip chip-red">New</span>}
              </div>
              <p className="muted small">
                {fmtDateTime(o.created_at)}
                {o.author ? ` · from ${o.author}` : ""}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{o.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
