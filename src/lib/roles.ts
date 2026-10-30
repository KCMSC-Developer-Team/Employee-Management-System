import type { Role } from './types';

export const ROLE_LABELS: Record<Role, string> = {
  developer: 'Developer',
  it: 'IT Technician',
  authority: 'Authority',
  coordinator: 'Routine Coordinator',
  mentor: 'Mentor',
};

export const ALL_ROLES: Role[] = ['developer', 'it', 'authority', 'coordinator', 'mentor'];

/** Roles an IT Technician may hand out. Developer / IT Technician can only be given by a Developer. */
export const IT_ASSIGNABLE: Role[] = ['authority', 'coordinator', 'mentor'];

export function assignableRoles(actorRoles: string[]): Role[] {
  return actorRoles.includes('developer') ? ALL_ROLES : IT_ASSIGNABLE;
}

/** A Developer can do everything every other role can. */
export function can(roles: string[], ...needed: Role[]): boolean {
  if (roles.includes('developer')) return true;
  return needed.some((r) => roles.includes(r));
}

export function cleanRoles(input: string[], actorRoles: string[]): Role[] {
  const allowed = assignableRoles(actorRoles);
  return Array.from(new Set(input.filter((r): r is Role => (allowed as string[]).includes(r))));
}

export const isDeveloper = (roles: string[]) => roles.includes('developer');
