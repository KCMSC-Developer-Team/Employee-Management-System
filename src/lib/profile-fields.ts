// Every field of the "Profile and Performance Sheet" (K C Model School & College).
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'textarea' | 'select';
  options?: string[];
  wide?: boolean;
  /** Filled in by administration (Developer / IT Technician / Authority), not by the employee. */
  admin?: boolean;
};

export type Group = { id: string; title: string; fields: Field[] };

const f = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, ...o });
const SECTOR = ['Private', 'Public'];

const school = (p: string): Field[] => [
  f(`${p}_institution`, 'Institution'),
  f(`${p}_district`, 'Location (District)'),
  f(`${p}_board`, 'Board / University'),
  f(`${p}_year`, 'Year of passing'),
  f(`${p}_group`, 'Group'),
  f(`${p}_result`, 'Result'),
];

const degree = (p: string): Field[] => [
  f(`${p}_institution`, 'Institution / University'),
  f(`${p}_sector`, 'Private / Public', { type: 'select', options: SECTOR }),
  f(`${p}_subject`, 'Subject'),
  f(`${p}_degree`, 'Degree attained'),
  f(`${p}_year`, 'Year of passing'),
  f(`${p}_result`, 'Result'),
];

const training = (p: string): Field[] => [
  f(`${p}_institution`, 'Institution / University'),
  f(`${p}_sector`, 'Private / Public', { type: 'select', options: SECTOR }),
  f(`${p}_year`, 'Year of passing'),
  f(`${p}_result`, 'Result'),
];

const job = (n: number): Field[] => [
  f(`exp${n}_org`, `${n}. Institute / Organization`),
  f(`exp${n}_designation`, 'Designation'),
  f(`exp${n}_from`, 'From', { type: 'date' }),
  f(`exp${n}_to`, 'To', { type: 'date' }),
];

const obs = (n: number): Field[] => [
  f(`obs${n}_date`, `${n}. Date`, { type: 'date', admin: true }),
  f(`obs${n}_subject`, 'Subject', { admin: true }),
  f(`obs${n}_desc`, 'Description', { type: 'textarea', wide: true, admin: true }),
];

export const GROUPS: Group[] = [
  {
    id: 'basic',
    title: 'Basic information',
    fields: [
      f('name_bn', 'Full name (in Bangla)'),
      f('dept', 'Subject / Admin department'),
      f('id_no', 'ID No.', { admin: true }),
      f('date_of_joining', 'Date of joining', { type: 'date', admin: true }),
      f('position', 'Position', { admin: true }),
      f('supervisor', 'Supervisor', { admin: true }),
    ],
  },
  { id: 'secondary', title: 'Educational background — Secondary', fields: school('sec') },
  { id: 'hsc', title: 'Educational background — Higher Secondary', fields: school('hsc') },
  { id: 'grad', title: 'Educational background — Graduation', fields: degree('grad') },
  { id: 'masters', title: "Educational background — Master's", fields: degree('ms') },
  { id: 'bed', title: 'BEd (if applicable)', fields: training('bed') },
  { id: 'med', title: 'MEd (if applicable)', fields: training('med') },
  {
    id: 'ntrca',
    title: 'NTRCA (if applicable)',
    fields: [
      f('ntrca_subject', 'Subject'),
      f('ntrca_school', 'School / College'),
      f('ntrca_year', 'Year of passing'),
      f('ntrca_result', 'Result'),
    ],
  },
  {
    id: 'other',
    title: 'Other degree / training (if applicable)',
    fields: [
      f('oth_institution', 'Institution / University'),
      f('oth_desc', 'Description'),
      f('oth_year', 'Year of passing'),
      f('oth_result', 'Result'),
    ],
  },
  { id: 'jobs', title: 'Job experience', fields: [...job(1), ...job(2), ...job(3)] },
  {
    id: 'personal',
    title: 'Personal information',
    fields: [
      f('father', "Father's name"),
      f('mother', "Mother's name"),
      f('dob', 'Date of birth', { type: 'date' }),
      f('gender', 'Gender', { type: 'select', options: ['Male', 'Female', 'Other'] }),
      f('blood', 'Blood group', {
        type: 'select',
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      }),
      f('religion', 'Religion'),
      f('marital', 'Marital status', {
        type: 'select',
        options: ['Single', 'Married', 'Divorced', 'Widowed'],
      }),
      f('perm_address', 'Permanent address', { type: 'textarea', wide: true }),
      f('present_address', 'Present address', { type: 'textarea', wide: true }),
      f('nid', 'NID / Passport No.'),
      f('home_district', 'Home district'),
      f('mobile', 'Mobile number'),
    ],
  },
  { id: 'observation', title: 'Observation', fields: [...obs(1), ...obs(2), ...obs(3), ...obs(4)] },
];

export const ALL_FIELDS: Field[] = GROUPS.flatMap((g) => g.fields);
export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(ALL_FIELDS.map((x) => [x.key, x]));
export const EMPLOYEE_KEYS = ALL_FIELDS.filter((x) => !x.admin).map((x) => x.key);
export const ADMIN_KEYS = ALL_FIELDS.filter((x) => x.admin).map((x) => x.key);
