import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

const sections = [
  {
    title: "1. Quem somos (Controlador dos dados)",
    items: [
      "Razão Social: Elev8 Negócios Digitais LTDA",
      "CNPJ: 63.823.086/0001-72",
      "País: Brasil",
      "E-mail do encarregado (DPO): privacy@whatrack.com",
    ],
  },
  {
    title: "2. Dados que coletamos",
    items: [
      "Contato e identificação: nome, e-mail, telefone, empresa.",
      "Uso do produto: páginas acessadas, ações em campanhas, logs de erro e performance.",
      "Dados de plataformas Meta: identificadores de usuário, tokens de acesso, informações básicas de perfil, conforme permissões concedidas.",
      "Dados técnicos: endereço IP, tipo de dispositivo, navegador e registros de acesso.",
    ],
  },
  {
    title: "3. Como usamos os dados",
    items: [
      "Execução de contrato: operar o WhatRack, autenticação, campanhas, métricas e suporte.",
      "Consentimento: integrações com plataformas de terceiros, incluindo Meta e WhatsApp.",
      "Legítimo interesse: melhoria contínua do produto, segurança, prevenção a fraudes e analytics.",
      "Cumprimento de obrigação legal: atendimento a determinações legais e regulatórias.",
    ],
  },
  {
    title: "4. Operadores de dados (terceiros)",
    items: [
      "Supabase: autenticação, banco de dados e armazenamento.",
      "Neon: banco de dados PostgreSQL.",
      "Vercel: hospedagem e infraestrutura de aplicação.",
      "Esses operadores tratam dados sob nossas instruções e contratos de confidencialidade.",
    ],
  },
  {
    title: "5. Compartilhamento de dados",
    items: [
      "Com operadores de infraestrutura, exclusivamente para viabilizar o funcionamento do serviço.",
      "Com provedores de pagamento e billing para processar cobranças.",
      "Com autoridades públicas apenas mediante obrigação legal ou ordem judicial.",
      "Jamais vendemos dados pessoais a terceiros.",
    ],
  },
  {
    title: "6. Transferência internacional de dados",
    items: [
      "Os dados podem ser processados e armazenados em servidores localizados fora do Brasil.",
      "Adotamos cláusulas contratuais padrão e medidas técnicas para garantir proteção adequada conforme a LGPD.",
    ],
  },
  {
    title: "7. Retenção e segurança",
    items: [
      "Mantemos dados enquanto a conta estiver ativa ou pelo tempo necessário para cumprir obrigações legais.",
      "Criptografia em trânsito e em repouso; controle de acesso por perfil.",
      "Backups regulares, monitoramento de disponibilidade e políticas de resposta a incidentes.",
    ],
  },
  {
    title: "8. Direitos do titular",
    items: [
      "Confirmação da existência de tratamento.",
      "Acesso aos dados pessoais.",
      "Correção de dados incompletos ou desatualizados.",
      "Anonimização, bloqueio ou eliminação de dados desnecessários.",
      "Portabilidade dos dados.",
      "Revogação do consentimento.",
      "Informação sobre compartilhamento de dados.",
    ],
  },
  {
    title: "9. Incidentes de segurança",
    items: [
      "Em caso de incidente de segurança que possa acarretar risco ou dano relevante, notificaremos os titulares e a Autoridade Nacional de Proteção de Dados (ANPD) conforme a legislação.",
    ],
  },
  {
    title: "10. Contato e atualizações",
    items: [
      "Dúvidas, solicitações ou exercício de direitos: privacy@whatrack.com",
      "Esta política poderá ser atualizada periodicamente; notificaremos usuários ativos sobre mudanças relevantes.",
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
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Como cuidamos dos seus dados
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Transparência sobre coleta, uso, compartilhamento e proteção das informações que passam pelo WhatRack.
            </p>
          </div>

          <div className="grid gap-6">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
              >
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <ul className="mt-4 space-y-2 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <span>Precisa de algo ou quer exercer seus direitos?</span>
            <Link
              href="mailto:privacy@whatrack.com"
              className="font-semibold text-primary hover:underline"
            >
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
