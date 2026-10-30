import type { FormState } from './types';

export const ok = (message: string): FormState => ({ ok: true, message });
export const fail = (message: string): FormState => ({ ok: false, message });
export const str = (fd: FormData, key: string, max = 500): string =>
  String(fd.get(key) ?? '')
    .trim()
    .slice(0, max);
