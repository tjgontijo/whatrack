import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

const sections = [
  {
    title: "1. Aceite e escopo",
    items: [
      "Ao usar o WhatRack, você concorda com estes Termos e com a Política de Privacidade.",
      "O serviço é disponibilizado para uso empresarial; o usuário deve ter autoridade para aceitar em nome da empresa.",
    ],
  },
  {
    title: "2. Uso do produto",
    items: [
      "Não utilize o produto para spam, fraude ou violação das políticas de canais (ex.: Meta/WhatsApp).",
      "Mantenha credenciais e tokens seguros; você é responsável pelo uso feito pela sua conta.",
      "Podemos suspender contas em caso de abuso, risco de segurança ou inadimplência.",
    ],
  },
  {
    title: "3. Campanhas e integrações",
    items: [
      "Envios dependem das políticas e limites dos provedores (Meta Cloud, billing, etc.).",
      "Você é responsável pelo conteúdo das mensagens e pela base de contatos utilizada.",
      "Integrações de terceiros podem ter termos próprios; ao conectá-las, você concorda com tais termos.",
    ],
  },
  {
    title: "4. Pagamentos e créditos",
    items: [
      "Planos e créditos são cobrados conforme tabela vigente; reembolsos seguem política interna.",
      "Créditos de campanha e de IA são domínios distintos e não são intercambiáveis.",
      "Faturas vencidas podem gerar suspensão ou limitação de acesso.",
    ],
  },
  {
    title: "5. Propriedade intelectual",
    items: [
      "O software, marca e materiais do WhatRack pertencem à empresa; o cliente recebe direito de uso limitado.",
      "Feedbacks podem ser usados para melhorar o produto sem ônus adicional.",
    ],
  },
  {
    title: "6. Garantias e limitações",
    items: [
      "Serviço fornecido \"no estado em que se encontra\", com esforços razoáveis de disponibilidade.",
      "Não garantimos resultados específicos de campanhas; métricas dependem de fatores externos.",
    ],
  },
  {
    title: "7. Privacidade e segurança",
    items: [
      "Seguimos a Política de Privacidade para tratamento de dados.",
      "Implementamos controles de segurança; o cliente deve zelar por acessos e permissões internos.",
    ],
  },
  {
    title: "8. Rescisão",
    items: [
      "Você pode encerrar a conta a qualquer momento; cobraremos eventuais valores pendentes.",
      "Podemos encerrar acesso por violação dos termos, risco de segurança ou uso indevido.",
    ],
  },
  {
    title: "9. Contato e alterações",
    items: [
      "Dúvidas: legal@whatrack.com",
      "Alterações relevantes serão comunicadas aos usuários ativos.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="relative overflow-hidden">
        <div className="absolute -left-40 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-36 bottom-24 h-72 w-72 rounded-full bg-chart-5/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-8 lg:px-0">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              📄 Termos de Uso
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Regras de uso do WhatRack</h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Condições para uso responsável do produto, integrações e créditos de campanha/IA.
            </p>
          </div>

          <div className="grid gap-6">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <ul className="mt-4 space-y-2 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <span>Precisa falar com o jurídico?</span>
            <Link href="mailto:legal@whatrack.com" className="font-semibold text-primary hover:underline">
              legal@whatrack.com
            </Link>
            <span>ou</span>
            <Link href="/" className="font-semibold text-primary hover:underline">
              voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
