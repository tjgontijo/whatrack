import { notFound } from 'next/navigation';
import { HeaderPageShell } from '@/features/dashboard/components/layout';
import { DemoDataSettingsContent } from '@/features/settings/components/demo-data-settings-content';
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access';
import { resolveProjectContext } from '@/server/project/resolve-project-context';

type DemoDataPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>;
};

export default async function DemoDataPage({ params }: DemoDataPageProps) {
  const { organizationSlug, projectSlug } = await params;
  const access = await requireWorkspacePageAccess({ 
    organizationSlug,
    requireAdmin: true 
  });

  const projectContext = await resolveProjectContext({
    organizationSlug,
    projectSlug,
    userId: access.userId,
  });

  if (!projectContext) {
    notFound();
  }

  return (
    <HeaderPageShell title="Dados de Demonstração">
      <DemoDataSettingsContent 
        organizationId={projectContext.organizationId} 
        projectId={projectContext.projectId} 
      />
    </HeaderPageShell>
  );
}
