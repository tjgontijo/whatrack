import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { render, pretty } from '@react-email/render'
import * as React from 'react'

interface SubscriptionCanceledEmailProps {
  customerName?: string
  planName: string
  endDate: string
  resubscribeUrl?: string
}

export const SubscriptionCanceledEmail = ({
  customerName = 'Cliente',
  planName,
  endDate,
  resubscribeUrl,
}: SubscriptionCanceledEmailProps) => (
  <Html>
    <Head />
    <Preview>Assinatura cancelada - Whatrack</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerTitle}>Whatrack</Text>
          <Text style={headerSubtitle}>Gestão de Leads e WhatsApp</Text>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Text style={greeting}>
            Olá <strong>{customerName}</strong>,
          </Text>

          <Text style={paragraph}>
            Sua assinatura do Whatrack foi cancelada.
          </Text>

          {/* Details Box */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Detalhes do cancelamento</Text>
            <Text style={detailsText}>
              <strong>Plano:</strong> {planName}
            </Text>
            <Text style={detailsText}>
              <strong>Acesso até:</strong> {endDate}
            </Text>
          </Section>

          <Text style={paragraph}>
            Você continuará tendo acesso ao plano {planName} até {endDate}. Após essa data, sua conta será migrada para o plano gratuito.
          </Text>

          <Text style={paragraph}>
            Sentiremos sua falta! Se mudar de ideia, você pode reativar sua assinatura a qualquer momento.
          </Text>

          {resubscribeUrl && (
            <Section style={ctaContainer}>
              <Link href={resubscribeUrl} style={ctaButton}>
                Reativar Assinatura
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          {/* Feedback */}
          <Section style={feedbackBox}>
            <Text style={feedbackTitle}>Nos ajude a melhorar</Text>
            <Text style={feedbackText}>
              Se você tiver um momento, gostaríamos de saber o motivo do cancelamento para podermos melhorar nosso serviço.
            </Text>
            <Text style={feedbackText}>
              ✉️ Envie seu feedback para: <Link href="mailto:suporte@homenz.com.br" style={linkStyle}>suporte@homenz.com.br</Link>
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            © 2025 Whatrack. Todos os direitos reservados.
          </Text>
          <Text style={footerSmall}>
            Este é um email automático. Por favor, não responda.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SubscriptionCanceledEmail

export async function generateSubscriptionCanceledEmail({
  customerName = 'Cliente',
  planName,
  endDate,
  resubscribeUrl,
}: SubscriptionCanceledEmailProps) {
  const subject = 'Assinatura cancelada - Whatrack'

  const text = [
    `Olá ${customerName}!`,
    '',
    'Sua assinatura do Whatrack foi cancelada.',
    '',
    `Plano: ${planName}`,
    `Acesso até: ${endDate}`,
    '',
    `Você continuará tendo acesso ao plano ${planName} até ${endDate}.`,
    'Após essa data, sua conta será migrada para o plano gratuito.',
    '',
    'Sentiremos sua falta! Se mudar de ideia, você pode reativar sua assinatura a qualquer momento.',
    resubscribeUrl ? `Reativar assinatura: ${resubscribeUrl}` : '',
    '',
    'Nos ajude a melhorar! Envie seu feedback para: suporte@homenz.com.br',
  ].filter(Boolean).join('\n')

  const htmlRaw = await render(
    React.createElement(SubscriptionCanceledEmail, { customerName, planName, endDate, resubscribeUrl })
  )
  const html = await pretty(htmlRaw)

  return { subject, text, html }
}

// Styles
const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const headerTitle = {
  color: '#ffffff',
  margin: '0',
  fontSize: '28px',
  fontWeight: 'bold' as const,
}

const headerSubtitle = {
  color: '#d1d5db',
  margin: '8px 0 0 0',
  fontSize: '14px',
}

const content = {
  background: '#ffffff',
  padding: '40px 30px',
  borderRadius: '0 0 8px 8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const greeting = {
  fontSize: '16px',
  color: '#1f2937',
  margin: '0 0 24px 0',
  lineHeight: '1.6',
}

const paragraph = {
  fontSize: '16px',
  color: '#1f2937',
  margin: '0 0 24px 0',
  lineHeight: '1.6',
}

const detailsBox = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const detailsTitle = {
  fontSize: '15px',
  color: '#374151',
  fontWeight: 'bold' as const,
  margin: '0 0 12px 0',
}

const detailsText = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '4px 0',
  lineHeight: '1.5',
}

const ctaContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '14px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const feedbackBox = {
  background: '#eff6ff',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const feedbackTitle = {
  fontSize: '15px',
  color: '#1e40af',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const feedbackText = {
  fontSize: '13px',
  color: '#1d4ed8',
  margin: '4px 0',
  lineHeight: '1.5',
}

const linkStyle = {
  color: '#2563eb',
  fontWeight: 'bold' as const,
  wordBreak: 'break-all' as const,
}

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
}

const footerSmall = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0',
}
