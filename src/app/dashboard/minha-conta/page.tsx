import { MyAccountContent } from '@/components/dashboard/account/my-account-content'

export default function MyAccountPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-8 first:pt-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seus dados pessoais, segurança e detalhes da conta.
        </p>
      </div>

      <MyAccountContent />
    </div>
  )
}
