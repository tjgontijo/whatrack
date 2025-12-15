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

interface PaymentConfirmedEmailProps {
  customerName?: string
  amount: string
  planName: string
  invoiceUrl?: string
}

export const PaymentConfirmedEmail = ({
  customerName = 'Cliente',
  amount,
  planName,
  invoiceUrl,
}: PaymentConfirmedEmailProps) => (
  <Html>
    <Head />
    <Preview>Pagamento confirmado - Whatrack</Preview>
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
            Seu pagamento foi confirmado com sucesso!
          </Text>

          {/* Payment Details */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Detalhes do pagamento</Text>
            <Text style={detailsText}>
              <strong>Plano:</strong> {planName}
            </Text>
            <Text style={detailsText}>
              <strong>Valor:</strong> {amount}
            </Text>
          </Section>

          {invoiceUrl && (
            <Section style={ctaContainer}>
              <Link href={invoiceUrl} style={ctaButton}>
                Ver Fatura
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          {/* Support */}
          <Section style={supportBox}>
            <Text style={supportTitle}>Precisa de ajuda?</Text>
            <Text style={supportText}>
              ✉️ E-mail: <Link href="mailto:suporte@homenz.com.br" style={linkStyle}>suporte@homenz.com.br</Link>
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

export default PaymentConfirmedEmail

export async function generatePaymentConfirmedEmail({
  customerName = 'Cliente',
  amount,
  planName,
  invoiceUrl,
}: PaymentConfirmedEmailProps) {
  const subject = 'Pagamento confirmado - Whatrack'

  const text = [
    `Olá ${customerName}!`,
    '',
    'Seu pagamento foi confirmado com sucesso!',
    '',
    `Plano: ${planName}`,
    `Valor: ${amount}`,
    '',
    invoiceUrl ? `Ver fatura: ${invoiceUrl}` : '',
    '',
    'Precisa de ajuda?',
    'E-mail: suporte@homenz.com.br',
  ].filter(Boolean).join('\n')

  const htmlRaw = await render(
    React.createElement(PaymentConfirmedEmail, { customerName, amount, planName, invoiceUrl })
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
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
  color: '#d1fae5',
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
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const detailsTitle = {
  fontSize: '15px',
  color: '#065f46',
  fontWeight: 'bold' as const,
  margin: '0 0 12px 0',
}

const detailsText = {
  fontSize: '14px',
  color: '#047857',
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

const supportBox = {
  background: '#f0fdf4',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const supportTitle = {
  fontSize: '15px',
  color: '#166534',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const supportText = {
  fontSize: '13px',
  color: '#15803d',
  margin: '4px 0',
  lineHeight: '1.5',
}

const linkStyle = {
  color: '#10b981',
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
