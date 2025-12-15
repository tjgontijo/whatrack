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

interface InvoiceEmailProps {
  customerName?: string
  invoiceNumber: string
  amount: string
  dueDate: string
  planName: string
  invoiceUrl?: string
}

export const InvoiceEmail = ({
  customerName = 'Cliente',
  invoiceNumber,
  amount,
  dueDate,
  planName,
  invoiceUrl,
}: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Preview>Nova fatura disponível - Whatrack</Preview>
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
            Uma nova fatura foi gerada para sua assinatura.
          </Text>

          {/* Invoice Details */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Detalhes da fatura</Text>
            <Text style={detailsText}>
              <strong>Número:</strong> {invoiceNumber}
            </Text>
            <Text style={detailsText}>
              <strong>Plano:</strong> {planName}
            </Text>
            <Text style={detailsText}>
              <strong>Valor:</strong> {amount}
            </Text>
            <Text style={detailsText}>
              <strong>Vencimento:</strong> {dueDate}
            </Text>
          </Section>

          {invoiceUrl && (
            <Section style={ctaContainer}>
              <Link href={invoiceUrl} style={ctaButton}>
                Ver Fatura
              </Link>
            </Section>
          )}

          <Text style={infoText}>
            Se você configurou pagamento automático, não é necessário nenhuma ação. O valor será debitado automaticamente.
          </Text>

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

export default InvoiceEmail

export async function generateInvoiceEmail({
  customerName = 'Cliente',
  invoiceNumber,
  amount,
  dueDate,
  planName,
  invoiceUrl,
}: InvoiceEmailProps) {
  const subject = `Nova fatura #${invoiceNumber} - Whatrack`

  const text = [
    `Olá ${customerName}!`,
    '',
    'Uma nova fatura foi gerada para sua assinatura.',
    '',
    `Número: ${invoiceNumber}`,
    `Plano: ${planName}`,
    `Valor: ${amount}`,
    `Vencimento: ${dueDate}`,
    '',
    invoiceUrl ? `Ver fatura: ${invoiceUrl}` : '',
    '',
    'Se você configurou pagamento automático, não é necessário nenhuma ação.',
    '',
    'Precisa de ajuda?',
    'E-mail: suporte@homenz.com.br',
  ].filter(Boolean).join('\n')

  const htmlRaw = await render(
    React.createElement(InvoiceEmail, { customerName, invoiceNumber, amount, dueDate, planName, invoiceUrl })
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
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
  color: '#bfdbfe',
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
  background: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const detailsTitle = {
  fontSize: '15px',
  color: '#1e40af',
  fontWeight: 'bold' as const,
  margin: '0 0 12px 0',
}

const detailsText = {
  fontSize: '14px',
  color: '#1d4ed8',
  margin: '4px 0',
  lineHeight: '1.5',
}

const ctaContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '14px',
}

const infoText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0',
  lineHeight: '1.6',
  fontStyle: 'italic' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const supportBox = {
  background: '#f0f9ff',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const supportTitle = {
  fontSize: '15px',
  color: '#0369a1',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const supportText = {
  fontSize: '13px',
  color: '#0284c7',
  margin: '4px 0',
  lineHeight: '1.5',
}

const linkStyle = {
  color: '#0ea5e9',
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
