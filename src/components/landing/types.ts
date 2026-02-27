// Types for Landing Page variants
export type LandingVariant = 'generic' | 'agencias' | 'lancadores' | 'empresas'

export interface LandingContent {
  variant: LandingVariant
  hero: {
    badge: string
    headline: string
    highlightedText: string
    subheadline: string
    ctaPrimary: string
    ctaSecondary: string
    highlights: string[]
  }
  problem: {
    badge: string
    headline: string
    highlightedText: string
    subheadline: string
    problems: {
      icon: 'message' | 'trending' | 'users' | 'alert'
      title: string
      description: string
    }[]
    closingText?: string
  }
  solution: {
    badge: string
    headline: string
    highlightedText: string
    subheadline: string
    cards: {
      icon: 'check' | 'zap' | 'chart' | 'shield'
      title: string
      description: string
      size: 'large' | 'medium'
      color: 'primary' | 'purple' | 'amber' | 'emerald'
    }[]
  }
  howItWorks: {
    badge: string
    headline: string
    highlightedText: string
    subheadline: string
    steps: {
      icon: 'plug' | 'database' | 'trending'
      title: string
      description: string
    }[]
  }
  cta: {
    headline: string
    subheadline: string
    ctaPrimary: string
    ctaSecondary: string
    microcopy: string
  }
}

export const LANDING_CONTENT: Record<LandingVariant, LandingContent> = {
  generic: {
    variant: 'generic',
    hero: {
      badge: 'Rastreamento real de vendas no WhatsApp',
      headline: 'O Meta não sabe quem comprou no WhatsApp do seu cliente.',
      highlightedText: 'E a culpa cai em você.',
      subheadline:
        'O WhaTrack conecta cada conversa à campanha que gerou o clique e devolve eventos como o de Lead e Purchase pro Meta Ads via API de conversão. O algoritmo para de otimizar pra curioso e começa a entregar para compradores reais.',
      ctaPrimary: 'Testar grátis por 7 dias',
      ctaSecondary: 'Ver como funciona',
      highlights: [
        'API Oficial do WhatsApp',
        'API de Conversão',
        'Insights de Campanhas',
      ],
    },
    problem: {
      badge: 'O PROBLEMA',
      headline: 'Seu cliente vende pelo WhatsApp, mas você e a Meta',
      highlightedText: 'não recebem dado nenhum de volta.',
      subheadline:
        'Entre o clique no anúncio e a venda na conversa, existe um buraco negro. Você otimiza campanha sem saber o que realmente vendeu. Você só sabe que o lead chegou.',
      problems: [
        {
          icon: 'message',
          title: 'Vendas invisíveis',
          description:
            'A venda acontece dentro da conversa do cliente. Mas o Meta só enxerga o clique. Sem evento de purchase, o algoritmo nunca aprende quem realmente compra, e você nunca sabe qual campanha gerou resultado.',
        },
        {
          icon: 'trending',
          title: 'Algoritmo alimentado com lixo',
          description:
            'Sem sinal de venda, o Meta otimiza pro único dado que tem: quem manda "Qual o valor?". Você investe pra atrair comprador e o algoritmo entrega curioso. O CPA sobe e você não sabe por quê.',
        },
        {
          icon: 'users',
          title: 'Comercial do cliente afogado em lead frio',
          description:
            'Leads sem qualificação entopem o WhatsApp do seu cliente. O comercial dele gasta energia com quem nunca ia comprar e esfria quem tinha potencial real. Aí vem a mensagem: "Só chega curioso."',
        },
        {
          icon: 'alert',
          title: 'Decisões no escuro',
          description:
            'Qual criativo gerou venda? Qual campanha trouxe comprador? O problema é o tráfego que você roda ou o atendimento do cliente? Sem dado, cada decisão é um chute, e cada reunião vira discussão.',
        },
      ],
      closingText:
        'Antes eu dependia do cliente me mandar planilha pra saber se vendeu. Agora abro o painel e sei exatamente qual campanha gerou cada venda.',
    },
    solution: {
      badge: 'A SOLUÇÃO',
      headline: 'Fechamos o ciclo entre o anúncio e a',
      highlightedText: 'venda do seu cliente.',
      subheadline:
        'O que acontece dentro do WhatsApp do cliente agora vira dado estruturado e volta pro Meta como evento real pra você otimizar campanha.',
      cards: [
        {
          icon: 'check',
          title: 'Cada venda conectada à sua campanha',
          description:
            'O WhaTrack captura o identificador oficial do Meta e conecta cada conversa do WhatsApp do cliente à campanha, conjunto e criativo que você rodou. Você vê exatamente qual anúncio gerou cada venda.',
          size: 'large',
          color: 'primary',
        },
        {
          icon: 'zap',
          title: 'O algoritmo aprende quem compra de verdade',
          description:
            'Eventos de Lead qualificado e Purchase são enviados ao Meta via API de Conversão. O algoritmo para de otimizar pra curioso e começa a buscar perfil de comprador real. Suas campanhas melhoram sozinhas.',
          size: 'medium',
          color: 'purple',
        },
        {
          icon: 'chart',
          title: 'Relatório com dado de venda real',
          description:
            'Sem depender de planilha que o cliente nunca manda, nem de CRM que o comercial dele não preenche. O painel mostra campanha, lead, venda e tempo de resposta. Tudo automático. Você abre e apresenta.',
          size: 'medium',
          color: 'amber',
        },
        {
          icon: 'shield',
          title: 'IA que separa comprador de curioso',
          description:
            'O Copilot analisa cada conversa do cliente em tempo real. Identifica intenção, objeção e estágio do lead. Só dispara evento de Lead quando o contato é qualificado de verdade. O Meta aprende com dado limpo.',
          size: 'large',
          color: 'emerald',
        },
      ],
    },
    howItWorks: {
      badge: 'COMO FUNCIONA',
      headline: 'Funcionando em 5 minutos.',
      highlightedText: 'Sem código.',
      subheadline:
        'Você conecta as contas do cliente e o WhaTrack faz o resto. Não precisa de desenvolvedor, não precisa mudar o processo de ninguém.',
      steps: [
        {
          icon: 'plug',
          title: 'Conecte o Meta Ads e o WhatsApp do cliente',
          description:
            'Integração direta com a conta de anúncios e o WhatsApp Business. Leva menos de 5 minutos por cliente. Zero configuração técnica.',
        },
        {
          icon: 'database',
          title: 'O WhaTrack rastreia e qualifica',
          description:
            'Cada conversa é automaticamente conectada à campanha de origem. Nosso copilot analisa o processo de venda em tempo real e dispara eventos qualificados pro Meta.',
        },
        {
          icon: 'trending',
          title: 'Você vê o que realmente vende',
          description:
            'Abra o painel e veja: qual campanha gerou venda, qual criativo converte, quanto tempo o comercial do cliente demora pra responder. Dado real. Não achismo.',
        },
      ],
    },
    cta: {
      headline: '"Lead ruim" nunca mais sem resposta.',
      subheadline:
        'Conecte em 5 minutos. Veja de onde vêm as vendas do seu cliente e prove com dado, não com argumento.',
      ctaPrimary: 'Testar grátis por 7 dias',
      ctaSecondary: 'Falar com o time',
      microcopy: '7 dias grátis · Sem cartão · Setup em 5 minutos',
    },
  },

  agencias: {
    variant: 'agencias',
    hero: {
      badge: 'Para agências e gestores de tráfego',
      headline: 'Prove para seu cliente que seus anúncios vendem.',
      highlightedText: 'Com números, não com desculpas.',
      subheadline:
        'O WhaTrack conecta os anúncios do seu cliente às vendas no WhatsApp. Você vê qual campanha vendeu, quanto vendeu, e mostra um relatório que ninguém questiona.',
      ctaPrimary: 'Ver vendas reais do meu cliente',
      ctaSecondary: 'Como funciona em 2 minutos',
      highlights: [
        '"Descobri que 70% das vendas vinham de 2 campanhas"',
        'Relatório pronto para enviar ao cliente',
        'Conecta em 5 minutos, sem TI do cliente',
      ],
    },
    problem: {
      badge: 'Você já passou por isso?',
      headline: 'Seu cliente acha que os anúncios não vendem.',
      highlightedText: 'Mas você sabe que vendem.',
      subheadline: 'O problema é que você não consegue provar. E sem prova, perde o cliente.',
      problems: [
        {
          icon: 'message',
          title: '"Quantas vendas vieram esse mês?"',
          description:
            'Seu cliente pergunta e você não tem certeza. Você sabe que vendeu, mas não consegue mostrar qual campanha trouxe cada venda.',
        },
        {
          icon: 'trending',
          title: 'O CPA só sobe',
          description:
            'Sem devolver os dados de venda pro Meta, o algoritmo não aprende quem compra de verdade. Resultado: custo por lead cada vez mais alto.',
        },
        {
          icon: 'users',
          title: 'Horas montando relatório',
          description:
            'Você cruza planilha do comercial com o Gerenciador de Anúncios, soma na mão, e ainda assim o cliente duvida dos números.',
        },
        {
          icon: 'alert',
          title: 'Perdendo contas',
          description:
            'Sem ROI claro, o cliente acha que a campanha não funciona e cancela. Você perde receita recorrente por falta de visibilidade.',
        },
      ],
      closingText:
        'A verdade é que seus anúncios provavelmente vendem mais do que parece. Você só não consegue mostrar.',
    },
    solution: {
      badge: 'A solução para sua agência',
      headline: 'Transforme vendas invisíveis em',
      highlightedText: 'provas irrefutáveis.',
      subheadline:
        'Conecte os anúncios do cliente às vendas do WhatsApp dele. Mostre exatamente o que funciona.',
      cards: [
        {
          icon: 'check',
          title: 'Prove cada venda',
          description:
            'Anúncio X trouxe lead Y que virou venda de R$ Z. Acabou a discussão. Seu cliente vê de onde vem cada real de faturamento.',
          size: 'large',
          color: 'primary',
        },
        {
          icon: 'zap',
          title: 'CPA caindo, cliente feliz',
          description:
            'O WhaTrack devolve os dados de venda pro Meta automaticamente. O algoritmo aprende e encontra mais compradores. Seu CPA cai naturalmente.',
          size: 'medium',
          color: 'purple',
        },
        {
          icon: 'chart',
          title: 'Relatório em 1 clique',
          description:
            'Chega de planilha. Gere o relatório de ROI por campanha e envie pro cliente em segundos. Profissional e inquestionável.',
          size: 'medium',
          color: 'amber',
        },
        {
          icon: 'shield',
          title: 'Escale com confiança',
          description:
            'Sabendo exatamente o que funciona, você recomenda aumentar budget com dados. Seu cliente confia mais, investe mais, você ganha mais.',
          size: 'large',
          color: 'emerald',
        },
      ],
    },
    howItWorks: {
      badge: 'Setup rápido',
      headline: 'Implemente no cliente em',
      highlightedText: '5 minutos.',
      subheadline:
        'Não precisa da TI do cliente. Não precisa de pixel complicado. Só clicar e conectar.',
      steps: [
        {
          icon: 'plug',
          title: 'Cliente conecta as contas',
          description:
            'Seu cliente faz login com o Meta dele e conecta o WhatsApp Business. Você acompanha tudo pelo seu painel.',
        },
        {
          icon: 'database',
          title: 'Rastreamento automático',
          description:
            'Cada conversa no WhatsApp do cliente é ligada ao anúncio que a trouxe. Sem esforço manual, sem erro humano.',
        },
        {
          icon: 'trending',
          title: 'Mostre o resultado',
          description:
            'Abra o painel, gere o relatório, envie pro cliente. Ele vê que funciona, renova o contrato, aumenta o budget.',
        },
      ],
    },
    cta: {
      headline: 'Pare de perder clientes por falta de prova.',
      subheadline:
        'Conecte a conta de um cliente agora e veja os dados aparecendo hoje. Se não funcionar em 7 dias, cancele sem pagar.',
      ctaPrimary: 'Testar com meu cliente',
      ctaSecondary: 'Ver planos para agências',
      microcopy: 'Setup em 5 min · Sem cartão para testar · Múltiplos clientes no mesmo painel',
    },
  },

  lancadores: {
    variant: 'lancadores',
    hero: {
      badge: 'Para infoprodutores e lançadores',
      headline: 'Descubra exatamente quanto cada real investido',
      highlightedText: 'retorna em vendas.',
      subheadline:
        'O WhaTrack rastreia do clique no anúncio até o fechamento no WhatsApp. Você para de chutar e começa a escalar com certeza.',
      ctaPrimary: 'Ver meu ROI real',
      ctaSecondary: 'Como funciona em lançamentos',
      highlights: [
        'Saiba qual campanha trouxe cada venda',
        'Pare de escalar o que não funciona',
        'Dados em tempo real durante o lançamento',
      ],
    },
    problem: {
      badge: 'Você conhece essa sensação?',
      headline: 'Investiu R$ 200 mil em ads e',
      highlightedText: 'não sabe quanto voltou.',
      subheadline: 'O Meta diz uma coisa, o financeiro diz outra, e você fica no escuro.',
      problems: [
        {
          icon: 'message',
          title: 'Vendas perdidas no funil',
          description:
            'O lead clica no anúncio, vai pro WhatsApp, e você perde o rastro. Quando fecha, não sabe qual campanha trouxe.',
        },
        {
          icon: 'trending',
          title: 'Escalando no escuro',
          description:
            'Você aumenta budget de campanhas que parecem boas, mas não tem certeza se são elas que vendem. Pode estar queimando dinheiro.',
        },
        {
          icon: 'users',
          title: 'Equipe comercial sem prioridade',
          description:
            'Seus closers atendem na ordem que chega, não na ordem de quem está mais quente. Leads bons esfriam enquanto esperam.',
        },
        {
          icon: 'alert',
          title: 'Lançamento termina, dúvida fica',
          description:
            'Acabou o lançamento e você ainda não sabe qual criativo, qual público, qual copy realmente converteu. O próximo vira outro chute.',
        },
      ],
      closingText:
        'A verdade é que você provavelmente está mais perto do ROI ideal do que imagina. Só não consegue enxergar onde está o ouro.',
    },
    solution: {
      badge: 'A solução para seu lançamento',
      headline: 'Visão total do clique até',
      highlightedText: 'a venda.',
      subheadline:
        'Conecte seus anúncios ao seu WhatsApp e veja exatamente o que está funcionando.',
      cards: [
        {
          icon: 'check',
          title: 'Cada venda rastreada',
          description:
            'Veja qual campanha, qual anúncio, qual criativo trouxe cada comprador. Fim das suposições, início das decisões certeiras.',
          size: 'large',
          color: 'primary',
        },
        {
          icon: 'zap',
          title: 'Meta aprendendo com você',
          description:
            'O WhaTrack devolve os dados de venda pro algoritmo automaticamente. Suas campanhas ficam mais inteligentes a cada fechamento.',
          size: 'medium',
          color: 'purple',
        },
        {
          icon: 'chart',
          title: 'ROI em tempo real',
          description:
            'Durante o lançamento, veja o retorno de cada campanha ao vivo. Realoque budget no meio do jogo com confiança.',
          size: 'medium',
          color: 'amber',
        },
        {
          icon: 'shield',
          title: 'Leads quentes primeiro',
          description:
            'Nossa IA identifica quem está mais perto de comprar. Seu time comercial foca em quem vai fechar, não em quem está só curiosando.',
          size: 'large',
          color: 'emerald',
        },
      ],
    },
    howItWorks: {
      badge: 'Pronto para o lançamento',
      headline: 'Configure antes do carrinho abrir.',
      highlightedText: '5 minutos.',
      subheadline:
        'Conecte suas contas e tenha visibilidade total durante todo o período de vendas.',
      steps: [
        {
          icon: 'plug',
          title: 'Conecte Meta e WhatsApp',
          description:
            'Login rápido nas suas contas. Não precisa de desenvolvedor, não precisa de integração complexa.',
        },
        {
          icon: 'database',
          title: 'Rastreamento automático',
          description:
            'Cada lead que entra no WhatsApp é ligado à campanha que o trouxe. Quando fechar, você sabe exatamente de onde veio.',
        },
        {
          icon: 'trending',
          title: 'Escale o que funciona',
          description:
            'Veja em tempo real qual campanha está convertendo. Coloque mais dinheiro no que dá resultado, pause o que não dá.',
        },
      ],
    },
    cta: {
      headline: 'Seu próximo lançamento com ROI claro.',
      subheadline:
        'Configure agora e tenha os dados prontos quando o carrinho abrir. Teste grátis por 7 dias.',
      ctaPrimary: 'Configurar para meu lançamento',
      ctaSecondary: 'Ver planos',
      microcopy: 'Setup em 5 min · Dados em tempo real · Cancela quando quiser',
    },
  },

  empresas: {
    variant: 'empresas',
    hero: {
      badge: 'Para empresas que vendem pelo WhatsApp',
      headline: 'Saiba exatamente quanto a propaganda está',
      highlightedText: 'trazendo de cliente.',
      subheadline:
        'O WhaTrack mostra de onde vem cada cliente que entra no seu WhatsApp. Você para de gastar sem saber se funciona.',
      ctaPrimary: 'Ver de onde vêm meus clientes',
      ctaSecondary: 'Entender como funciona',
      highlights: [
        'Veja qual propaganda traz mais clientes',
        'Saiba quanto custa conseguir cada cliente',
        'Relatório simples para você ou seu sócio',
      ],
    },
    problem: {
      badge: 'Isso acontece com você?',
      headline: 'Você gasta em propaganda mas',
      highlightedText: 'não sabe se funciona.',
      subheadline:
        'O cliente chega no WhatsApp, seu vendedor atende, e você nunca sabe o que trouxe ele.',
      problems: [
        {
          icon: 'message',
          title: 'Cliente chega, você não sabe de onde',
          description:
            'Alguém manda mensagem no WhatsApp perguntando sobre seu serviço. Veio do Instagram? Do Google? Da indicação? Você não faz ideia.',
        },
        {
          icon: 'trending',
          title: 'Gastando sem retorno claro',
          description:
            'Você paga a agência todo mês, investe em anúncios, mas não consegue ver se o dinheiro está voltando. Parece que some.',
        },
        {
          icon: 'users',
          title: 'Vendedor atende, informação some',
          description:
            'Seu vendedor fecha a venda, mas não registra direito. Quando você quer saber qual campanha funcionou, a informação não existe.',
        },
        {
          icon: 'alert',
          title: 'Decisão na intuição',
          description:
            'Renovar com a agência ou trocar? Aumentar o investimento ou cortar? Sem dados, toda decisão é um chute.',
        },
      ],
      closingText:
        'Você não precisa ser expert em marketing digital. Precisa só saber se o que está pagando está dando resultado.',
    },
    solution: {
      badge: 'A solução para sua empresa',
      headline: 'Veja de onde vem cada cliente.',
      highlightedText: 'Simples assim.',
      subheadline:
        'Conecte seu WhatsApp e suas propagandas. O WhaTrack mostra o que está funcionando em linguagem que você entende.',
      cards: [
        {
          icon: 'check',
          title: 'Cada cliente rastreado',
          description:
            'Quando alguém manda mensagem, você vê de onde veio: qual anúncio, qual rede social, qual campanha. Sem complicação.',
          size: 'large',
          color: 'primary',
        },
        {
          icon: 'zap',
          title: 'Propaganda mais inteligente',
          description:
            'O WhaTrack avisa o Facebook quando você fecha uma venda. Suas propagandas aprendem a encontrar mais clientes parecidos.',
          size: 'medium',
          color: 'purple',
        },
        {
          icon: 'chart',
          title: 'Números claros',
          description:
            'Quanto investiu, quantos clientes vieram, quanto faturou. Um relatório simples que você ou seu sócio entendem na hora.',
          size: 'medium',
          color: 'amber',
        },
        {
          icon: 'shield',
          title: 'Saiba quem está pronto',
          description:
            'Nosso sistema identifica quais clientes estão mais interessados. Seu vendedor foca em quem vai fechar mais rápido.',
          size: 'large',
          color: 'emerald',
        },
      ],
    },
    howItWorks: {
      badge: 'Fácil de usar',
      headline: 'Funcionando em',
      highlightedText: '5 minutos.',
      subheadline: 'Você não precisa entender de tecnologia. É só conectar as contas e pronto.',
      steps: [
        {
          icon: 'plug',
          title: 'Conecte suas contas',
          description:
            'Entre com seu Facebook e conecte seu WhatsApp Business. É só clicar em alguns botões, sem complicação.',
        },
        {
          icon: 'database',
          title: 'O sistema rastreia sozinho',
          description:
            'A partir daí, cada mensagem que chega no WhatsApp é ligada à propaganda que trouxe o cliente. Automaticamente.',
        },
        {
          icon: 'trending',
          title: 'Veja o que funciona',
          description:
            'Abra o painel e veja de onde vêm seus clientes. Saiba se a propaganda está valendo o investimento.',
        },
      ],
    },
    cta: {
      headline: 'Pare de gastar sem saber se funciona.',
      subheadline:
        'Conecte agora e veja de onde vêm seus clientes. Teste grátis por 7 dias, sem compromisso.',
      ctaPrimary: 'Começar a ver meus clientes',
      ctaSecondary: 'Ver planos e preços',
      microcopy: 'Fácil de configurar · Sem compromisso · Cancela quando quiser',
    },
  },
}
