import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

/** Run a parameterised SQL query ($1, $2 …) and return the rows. */
export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getClient() as any;
  const rows = await sql.query(text, params);
  return rows as T[];
}

export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
