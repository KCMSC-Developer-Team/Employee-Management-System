'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { isDeveloperEmail } from '@/lib/config';
import { fail, go, ok, str } from '@/lib/form';
import { sendSetPasswordLinks } from '@/lib/invite';
import { hashPassword } from '@/lib/auth';
import { assignableRoles, cleanRoles, isDeveloper } from '@/lib/roles';
import type { FormState, Role } from '@/lib/types';
import { isEmail } from '@/lib/utils';

type Target = { id: string; email: string; name: string; roles: string[]; active: boolean; password_hash: string | null };

async function loadTarget(id: string) {
  return one<Target>('select id, email, name, roles, active, password_hash from users where id = $1', [id]);
}

async function otherActiveDevelopers(excludeId: string) {
  const r = await one<{ n: number }>(
    `select count(*)::int as n from users where active = true and 'developer' = any(roles) and id <> $1`,
    [excludeId],
  );
  return r?.n ?? 0;
}

/* ── create one account ─────────────────────────────────── */
export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireRole('it');
  const name = str(fd, 'name', 120);
  const email = str(fd, 'email', 200).toLowerCase();
  const idNo = str(fd, 'id_no', 100);
  const designation = str(fd, 'designation', 120);
  const mobile = str(fd, 'mobile', 40);
  const roles = cleanRoles(fd.getAll('roles').map(String), actor.roles);
  if (isDeveloperEmail(email) && !roles.includes('developer')) roles.push('developer');

  if (!name) return fail('Enter the full name.');
  if (email && !isEmail(email)) return fail('Enter a valid e-mail address.');
  if (!idNo) return fail('Enter the employee ID number.');
  if (!designation) return fail('Enter the designation.');
  if (roles.length === 0) return fail('Tick at least one role.');

  const exists = await one('select 1 from users where id_no = $1 or ($2 <> \'\' and lower(email) = $2)', [idNo, email]);
  if (exists) return fail('An account with this e-mail or ID number already exists.');

  const created = await one<{ id: string }>(
    'insert into users (email, id_no, name, designation, roles, password_hash) values ($1,$2,$3,$4,$5,$6) returning id',
    [email || null, idNo, name, designation, roles, await hashPassword(idNo)],
  );
  if (!created) return fail('Could not create the account.');
  await query('insert into profiles (user_id, data) values ($1, $2::jsonb)', [
    created.id,
    JSON.stringify({ ...(mobile ? { mobile } : {}), id_no: idNo }),
  ]);

  revalidatePath('/employees');
  return ok(`Account created for ${name}. They can sign in with ID ${idNo} and use the same ID as their initial password.`);
}

/* ── bulk import ────────────────────────────────────────── */
export type ImportRow = {
  name: string;
  email: string | null;
  designation: string;
  roles: string[];
  mobile?: string;
  id_no?: string;
  position?: string;
  dept?: string;
  date_of_joining?: string;
  supervisor?: string;
};

export type ImportResult = {
  ok: boolean;
  message: string;
  created: number;
  skipped: { line: number; email: string; reason: string }[];
  emailError?: string;
  links?: { email: string; link: string }[];
};

export async function importUsers(rows: ImportRow[]): Promise<ImportResult> {
  const actor = await requireRole('it');
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: 'There are no rows to import.', created: 0, skipped: [] };
  }
  if (rows.length > 500) {
    return { ok: false, message: 'Please import at most 500 rows at a time.', created: 0, skipped: [] };
  }

  const skipped: ImportResult['skipped'] = [];
  const emails = rows.map((r) => String(r.email ?? '').trim().toLowerCase());
  const ids = rows.map((r) => String(r.id_no ?? '').trim());
  const existing = await query<{ e: string | null; n: string | null }>(
    'select lower(email) as e, id_no as n from users where lower(email) = any($1::text[]) or id_no = any($2::text[])',
    [emails.filter(Boolean), ids.filter(Boolean)],
  );
  const taken = new Set(existing.map((r) => r.e));
  const takenIds = new Set(existing.map((r) => r.n));
  const seen = new Set<string>();
  const createdUsers: { id: string; email: string; name: string }[] = [];
  let createdCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2; // spreadsheet line (row 1 = headings)
    const r = rows[i];
    const email = emails[i];
    const idNo = ids[i];
    const name = String(r.name ?? '').trim().slice(0, 120);
    const designation = String(r.designation ?? '').trim().slice(0, 120);
    const roles = cleanRoles((r.roles ?? []).map(String), actor.roles);
    if (isDeveloperEmail(email) && !roles.includes('developer')) roles.push('developer');

    if (!name) { skipped.push({ line, email, reason: 'Name is empty' }); continue; }
    if (email && !isEmail(email)) { skipped.push({ line, email, reason: 'E-mail is not valid' }); continue; }
    if (!idNo) { skipped.push({ line, email, reason: 'ID number is empty' }); continue; }
    if (!designation) { skipped.push({ line, email, reason: 'Designation is empty' }); continue; }
    if (roles.length === 0) { skipped.push({ line, email, reason: 'No role you are allowed to assign' }); continue; }
    if ((email && taken.has(email)) || takenIds.has(idNo)) { skipped.push({ line, email, reason: 'Account already exists' }); continue; }
    if ((email && seen.has(`email:${email}`)) || seen.has(`id:${idNo}`)) { skipped.push({ line, email, reason: 'Repeated in the file' }); continue; }
    if (email) seen.add(`email:${email}`);
    seen.add(`id:${idNo}`);

    const data: Record<string, string> = {};
    for (const k of ['mobile', 'id_no', 'position', 'dept', 'date_of_joining', 'supervisor'] as const) {
      const v = String(r[k] ?? '').trim().slice(0, 200);
      if (v) data[k] = v;
    }

    try {
      const u = await one<{ id: string }>(
        'insert into users (email, id_no, name, designation, roles, password_hash) values ($1,$2,$3,$4,$5,$6) returning id',
        [email || null, idNo, name, designation, roles, await hashPassword(idNo)],
      );
      if (!u) throw new Error('insert failed');
      await query('insert into profiles (user_id, data) values ($1, $2::jsonb)', [u.id, JSON.stringify(data)]);
      await query('update profiles set data = data || $2::jsonb where user_id = $1', [u.id, JSON.stringify({ id_no: idNo })]);
      createdCount++;
      if (email) createdUsers.push({ id: u.id, email, name });
    } catch {
      skipped.push({ line, email, reason: 'Could not be saved' });
    }
  }

  let emailError: string | undefined;
  let links: ImportResult['links'];
  if (createdUsers.length) {
    const r = await sendSetPasswordLinks(createdUsers, 'invite');
    if (!r.ok) {
      emailError = r.error;
      links = r.links.map((l) => ({ email: l.email, link: l.link }));
    }
  }
  revalidatePath('/employees');
  return {
    ok: createdCount > 0,
    message: `${createdCount} account(s) created, ${skipped.length} skipped.`,
    created: createdCount,
    skipped,
    emailError,
    links,
  };
}

/* ── edit an account (name, designation, roles, active) ─── */
export async function updateUser(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireRole('it');
  const target = await loadTarget(id);
  if (!target) return fail('This employee no longer exists.');
  if (target.roles.includes('developer') && !isDeveloper(actor.roles)) {
    return fail('Only a Developer can change another Developer.');
  }

  const name = str(fd, 'name', 120);
  const designation = str(fd, 'designation', 120);
  if (!name || !designation) return fail('Name and designation are required.');

  const mine = assignableRoles(actor.roles) as string[];
  const kept = target.roles.filter((r) => !mine.includes(r)); // roles this actor cannot touch stay as they are
  const roles = Array.from(new Set([...kept, ...cleanRoles(fd.getAll('roles').map(String), actor.roles)])) as Role[];
  const active = fd.get('active') === 'on';

  if (roles.length === 0) return fail('Keep at least one role.');
  if (id === actor.id && !active) return fail('You cannot deactivate your own account.');
  const losesDeveloper = target.roles.includes('developer') && (!roles.includes('developer') || !active);
  if (losesDeveloper && (await otherActiveDevelopers(id)) === 0) {
    return fail('There must always be at least one active Developer.');
  }

  await query('update users set name=$2, designation=$3, roles=$4, active=$5 where id=$1', [
    id,
    name,
    designation,
    roles,
    active,
  ]);
  revalidatePath(`/employees/${id}`);
  revalidatePath('/employees');
  return ok('Saved.');
}

export async function sendInvite(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const actor = await requireRole('it');
  const target = await loadTarget(id);
  if (!target) return fail('This employee no longer exists.');
  if (target.roles.includes('developer') && !isDeveloper(actor.roles)) return fail('Only a Developer can do this.');
  const kind = target.password_hash ? 'reset' : 'invite';
  const r = await sendSetPasswordLinks([target], kind);
  if (!target.email) return fail('This account has no e-mail address. The employee can sign in with their ID number and current password.');
  if (r.ok) return ok(`A ${kind === 'invite' ? 'set-password' : 'reset'} link was e-mailed to ${target.email}.`);
  return ok(`E-mail could not be sent (${r.error}). Give them this link yourself: ${r.links[0].link}`);
}

export async function deleteUser(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const actor = await requireRole('developer');
  if (id === actor.id) return fail('You cannot delete your own account.');
  const target = await loadTarget(id);
  if (!target) return fail('This employee no longer exists.');
  if (target.roles.includes('developer') && (await otherActiveDevelopers(id)) === 0) {
    return fail('There must always be at least one active Developer.');
  }
  await query('delete from users where id = $1', [id]);
  revalidatePath('/employees');
  return go('/employees');
}
