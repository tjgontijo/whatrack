import { redirect } from 'next/navigation'

export default async function AuditLogsPage() {
  redirect('/dashboard/settings/audit')
}
