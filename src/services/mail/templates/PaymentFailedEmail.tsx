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

interface PaymentFailedEmailProps {
  customerName?: string
  amount: string
  planName: string
  failureReason?: string
  updatePaymentUrl?: string
}

export const PaymentFailedEmail = ({
  customerName = 'Cliente',
  amount,
  planName,
  failureReason,
  updatePaymentUrl,
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>Falha no pagamento - Whatrack</Preview>
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
            Infelizmente, não conseguimos processar seu pagamento.
          </Text>

          {/* Warning Box */}
          <Section style={warningBox}>
            <Text style={warningTitle}>Falha no pagamento</Text>
            <Text style={warningText}>
              <strong>Plano:</strong> {planName}
            </Text>
            <Text style={warningText}>
              <strong>Valor:</strong> {amount}
            </Text>
            {failureReason && (
              <Text style={warningText}>
                <strong>Motivo:</strong> {failureReason}
              </Text>
            )}
          </Section>

          <Text style={paragraph}>
            Para evitar a suspensão do seu serviço, atualize seu método de pagamento o mais rápido possível.
          </Text>

          {updatePaymentUrl && (
            <Section style={ctaContainer}>
              <Link href={updatePaymentUrl} style={ctaButton}>
                Atualizar Pagamento
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          {/* Support */}
          <Section style={supportBox}>
            <Text style={supportTitle}>Precisa de ajuda?</Text>
            <Text style={supportText}>
              Se você acredita que isso é um erro ou precisa de assistência, entre em contato conosco.
            </Text>
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

export default PaymentFailedEmail

export async function generatePaymentFailedEmail({
  customerName = 'Cliente',
  amount,
  planName,
  failureReason,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  const subject = 'Falha no pagamento - Whatrack'

  const text = [
    `Olá ${customerName}!`,
    '',
    'Infelizmente, não conseguimos processar seu pagamento.',
    '',
    `Plano: ${planName}`,
    `Valor: ${amount}`,
    failureReason ? `Motivo: ${failureReason}` : '',
    '',
    'Para evitar a suspensão do seu serviço, atualize seu método de pagamento.',
    updatePaymentUrl ? `Atualizar pagamento: ${updatePaymentUrl}` : '',
    '',
    'Precisa de ajuda?',
    'E-mail: suporte@homenz.com.br',
  ].filter(Boolean).join('\n')

  const htmlRaw = await render(
    React.createElement(PaymentFailedEmail, { customerName, amount, planName, failureReason, updatePaymentUrl })
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
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
  color: '#fecaca',
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

const warningBox = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const warningTitle = {
  fontSize: '15px',
  color: '#991b1b',
  fontWeight: 'bold' as const,
  margin: '0 0 12px 0',
}

const warningText = {
  fontSize: '14px',
  color: '#b91c1c',
  margin: '4px 0',
  lineHeight: '1.5',
}

const ctaContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
  background: '#fef3c7',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const supportTitle = {
  fontSize: '15px',
  color: '#92400e',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const supportText = {
  fontSize: '13px',
  color: '#a16207',
  margin: '4px 0',
  lineHeight: '1.5',
}

const linkStyle = {
  color: '#b45309',
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
