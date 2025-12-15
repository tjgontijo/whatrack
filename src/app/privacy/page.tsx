import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

const sections = [
  {
    title: "1. Dados que coletamos",
    items: [
      "Contato e identificação: nome, e-mail, telefone, empresa.",
      "Uso do produto: páginas acessadas, ações em campanhas, logs de erro e performance.",
      "Integrações de terceiros: dados mínimos para conectar contas Meta/WhatsApp e billing.",
    ],
  },
  {
    title: "2. Como usamos os dados",
    items: [
      "Operar o produto: autenticação, campanhas, métricas e suporte.",
      "Segurança e antifraude: detecção de uso indevido, proteção de contas.",
      "Melhoria contínua: análise agregada e anonimizada para evoluir funcionalidades.",
    ],
  },
  {
    title: "3. Compartilhamento",
    items: [
      "Provedores de infraestrutura (cloud, e-mail, analytics) sob contratos de confidencialidade.",
      "Provedores de pagamento/billing para processar cobranças.",
      "Jamais vendemos dados pessoais a terceiros.",
    ],
  },
  {
    title: "4. Direitos do titular",
    items: [
      "Acessar, corrigir ou excluir seus dados pessoais.",
      "Revogar consentimentos e desconectar integrações.",
      "Solicitar exportação dos dados que mantemos sobre você.",
    ],
  },
  {
    title: "5. Retenção e segurança",
    items: [
      "Mantemos dados enquanto a conta estiver ativa ou pelo tempo legal mínimo.",
      "Criptografia em trânsito e em repouso; acesso restrito por perfil.",
      "Backups regulares e monitoramento de disponibilidade.",
    ],
  },
  {
    title: "6. Contato e atualizações",
    items: [
      "Dúvidas: privacy@whatrack.com",
      "Atualizaremos este documento quando houver mudanças relevantes; notificaremos usuários ativos.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="relative overflow-hidden">
        <div className="absolute -left-40 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-72 w-72 rounded-full bg-chart-3/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-8 lg:px-0">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              🔒 Política de Privacidade
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Como cuidamos dos seus dados</h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Transparência sobre coleta, uso, compartilhamento e proteção das informações que passam pelo WhatRack.
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
            <span>Precisa de algo ou quer exercer seus direitos?</span>
            <Link href="mailto:privacy@whatrack.com" className="font-semibold text-primary hover:underline">
              privacy@whatrack.com
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
