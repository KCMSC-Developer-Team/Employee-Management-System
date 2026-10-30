/**
 * The built-in Developer e-mail. Whoever creates an account with this address becomes
 * a Developer automatically — no seeding. Change it by setting DEVELOPER_EMAIL.
 */
export const DEVELOPER_EMAIL = (process.env.DEVELOPER_EMAIL || 'zarif@kcmsc.edu.bd').trim().toLowerCase();

export const isDeveloperEmail = (email: string) => email.trim().toLowerCase() === DEVELOPER_EMAIL;
