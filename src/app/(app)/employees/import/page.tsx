import { ImportWizard } from '@/components/ImportWizard';
import { PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { assignableRoles } from '@/lib/roles';

export const metadata = { title: 'Import employees' };
export const maxDuration = 60;

export default async function ImportPage() {
  const actor = await requireRole('it');
  return (
    <>
      <PageHead title="Import from a spreadsheet" sub="Create many accounts at once from an Excel or CSV file." />
      <ImportWizard assignable={assignableRoles(actor.roles)} />
    </>
  );
}
