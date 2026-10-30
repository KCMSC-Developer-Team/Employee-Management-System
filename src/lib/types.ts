export type FormState = { ok: boolean; message: string; redirect?: string } | null;

export type Role = 'developer' | 'it' | 'authority' | 'coordinator' | 'mentor';

export type SessionUser = {
  id: string;
  email: string | null;
  name: string;
  designation: string;
  roles: Role[];
  has_photo: boolean;
  photo_version: number;
  notif_push: boolean;
  notif_email: boolean;
};

export type Section = 'junior' | 'senior';

export type Period = {
  id: string;
  section: Section;
  position: number;
  label: string;
  kind: 'form' | 'period' | 'tiffin';
  start_time: string;
  end_time: string;
};
