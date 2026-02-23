import Link from 'next/link'
import { Header } from '@/components/home/Header'
import { Footer } from '@/components/home/Footer'

const sections = [
  {
    title: '0. Identificação',
    items: [
      'Razão Social: Elev8 Negócios Digitais LTDA',
      'CNPJ: 63.823.086/0001-72',
      'País: Brasil',
      'E-mail jurídico: legal@whatrack.com',
    ],
  },
  {
    title: '1. Aceite e escopo',
    items: [
      'Ao usar o WhatRack, você concorda integralmente com estes Termos e com a Política de Privacidade.',
      'O serviço é disponibilizado para uso empresarial; o usuário declara ter poderes para aceitar em nome da empresa.',
    ],
  },
  {
    title: '2. Uso do produto',
    items: [
      'É proibido utilizar o produto para spam, fraude, práticas abusivas ou em desacordo com as políticas da Meta, WhatsApp e demais plataformas integradas.',
      'O usuário é responsável por manter suas credenciais, tokens e acessos seguros.',
      'Podemos suspender ou encerrar contas em caso de violação destes Termos, risco de segurança, abuso ou inadimplência.',
    ],
  },
  {
    title: '3. Campanhas e integrações',
    items: [
      'O funcionamento de envios e campanhas depende das regras, limites e políticas das plataformas integradas.',
      'O cliente é exclusivamente responsável pelo conteúdo das mensagens e pela base de contatos utilizada.',
      'Ao integrar serviços de terceiros, o usuário declara estar ciente e de acordo com seus respectivos termos.',
    ],
  },
  {
    title: '4. Pagamentos e créditos',
    items: [
      'Planos, valores e créditos são cobrados conforme a tabela vigente no momento da contratação.',
      'Créditos de campanha e de inteligência artificial são independentes e não intercambiáveis.',
      'A falta de pagamento poderá resultar em suspensão, limitação ou cancelamento do acesso.',
    ],
  },
  {
    title: '5. Dados e titularidade',
    items: [
      'Os dados inseridos ou processados pelo cliente permanecem de sua exclusiva titularidade.',
      'O WhatRack atua como operador tecnológico desses dados, conforme descrito na Política de Privacidade.',
      'Não utilizamos dados do cliente para finalidades alheias à prestação do serviço.',
    ],
  },
  {
    title: '6. Propriedade intelectual',
    items: [
      'O software, marca, layout, código-fonte e materiais do WhatRack são de titularidade da empresa.',
      'O cliente recebe uma licença limitada, não exclusiva e intransferível para uso do produto.',
      'Sugestões e feedbacks podem ser utilizados para aprimorar o serviço sem ônus adicional.',
    ],
  },
  {
    title: '7. Garantias e disponibilidade',
    items: [
      'O serviço é fornecido no estado em que se encontra, com esforços razoáveis de estabilidade e segurança.',
      'Não garantimos resultados específicos de campanhas, métricas ou performance comercial.',
    ],
  },
  {
    title: '8. Limitação de responsabilidade',
    items: [
      'Em nenhuma hipótese o WhatRack será responsável por danos indiretos, lucros cessantes ou perda de receita.',
      'Quando aplicável, a responsabilidade total será limitada ao valor pago pelo cliente nos últimos 12 meses.',
    ],
  },
  {
    title: '9. Privacidade e segurança',
    items: [
      'O tratamento de dados pessoais segue integralmente a Política de Privacidade do WhatRack.',
      'O cliente é responsável pela gestão de permissões internas e acessos de seus colaboradores.',
    ],
  },
  {
    title: '10. Rescisão',
    items: [
      'O cliente pode encerrar a conta a qualquer momento, observadas obrigações financeiras pendentes.',
      'Podemos encerrar o acesso em caso de descumprimento destes Termos ou uso indevido da plataforma.',
    ],
  },
  {
    title: '11. Alterações dos termos',
    items: [
      'Estes Termos poderão ser atualizados periodicamente.',
      'Alterações relevantes serão comunicadas aos usuários ativos.',
    ],
  },
  {
    title: '12. Legislação e foro',
    items: [
      'Estes Termos são regidos pelas leis da República Federativa do Brasil.',
      'Fica eleito o foro da comarca do domicílio da empresa para dirimir eventuais controvérsias.',
    ],
  },
  {
    title: '13. Contato',
    items: ['Dúvidas ou questões jurídicas: legal@whatrack.com'],
  },
]

export default function TermsPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="relative overflow-hidden">
        <div className="bg-primary/10 absolute -left-40 top-24 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-chart-5/10 absolute -right-36 bottom-24 h-72 w-72 rounded-full blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-8 lg:px-0">
          <div className="space-y-4">
            <p className="bg-muted text-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              📄 Termos de Uso
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Regras de uso do WhatRack
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl">
              Condições legais para uso do produto, integrações, campanhas e créditos.
            </p>
          </div>

          <div className="grid gap-6">
            {sections.map((section) => (
              <div
                key={section.title}
                className="border-border/60 bg-card/60 rounded-2xl border p-6 shadow-sm backdrop-blur"
              >
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <ul className="text-muted-foreground mt-4 space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="bg-primary mt-1 h-2 w-2 rounded-full" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-border bg-muted/30 text-muted-foreground flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm">
            <span>Precisa falar com o jurídico?</span>
            <Link
              href="mailto:legal@whatrack.com"
              className="text-primary font-semibold hover:underline"
            >
              legal@whatrack.com
            </Link>
            <span>ou</span>
            <Link href="/" className="text-primary font-semibold hover:underline">
              voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
