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
import { pretty, render } from '@react-email/render'
import * as React from 'react'

interface OtpEmailProps {
  name?: string
  otp: string
  expiresIn?: number
}

export const OtpEmail = ({
  name = 'Usuário',
  otp,
  expiresIn = 5,
}: OtpEmailProps) => (
  <Html>
    <Head />
    <Preview>🔐 Seu código de acesso - Kadernim</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerTitle}>Kadernim</Text>
          <Text style={headerSubtitle}>Plataforma de Gerenciamento Educacional</Text>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Text style={greeting}>
            Olá <strong>{name}</strong>,
          </Text>

          <Text style={paragraph}>
            Use o código abaixo para acessar sua conta no Kadernim:
          </Text>

          {/* OTP Display */}
          <Section style={codeContainer}>
            <div style={codeBox}>
              <Text style={codeText}>{otp}</Text>
            </div>
          </Section>

          <Text style={expirationMessage}>
            Este código é válido por <strong>{expiresIn} minutos</strong>.
          </Text>

          <Hr style={hr} />

          {/* Warning */}
          <Section style={warningBox}>
            <Text style={warningText}>
              <strong>⏰ Atenção:</strong> Se você não solicitou este email, ignore-o.
            </Text>
          </Section>

          {/* Security Notice */}
          <Text style={securityText}>
            🔒 <strong>Segurança:</strong> Nunca compartilhe este código com outras pessoas. A Kadernim nunca pedirá seu código por email.
          </Text>

          {/* Support */}
          <Section style={supportBox}>
            <Text style={supportTitle}>Precisa de ajuda?</Text>
            <Text style={supportText}>
              📞 WhatsApp: <Link href="https://wa.me/551148635262" style={linkStyle}>+55 11 4863-5262</Link>
            </Text>
            <Text style={supportText}>
              ✉️ E-mail: <Link href="mailto:contato@kadernim.com.br" style={linkStyle}>contato@kadernim.com.br</Link>
            </Text>
            <Text style={supportText}>📍 Brasília - DF, Brasil</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            © 2025 Kadernim. Todos os direitos reservados.
          </Text>
          <Text style={footerSmall}>
            Este é um email automático. Por favor, não responda.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default OtpEmail

export async function generateOtpEmail({
  name = 'Usuário',
  otp,
  expiresIn = 5,
}: OtpEmailProps) {
  const subject = '🔐 Seu código de acesso - Kadernim'

  const text = [
    `Olá ${name}!`,
    '',
    `Seu código de acesso é: ${otp}`,
    '',
    `Este código expira em ${expiresIn} minutos. Não compartilhe com ninguém.`,
    '',
    'Precisa de ajuda?',
    'WhatsApp: +55 11 4863-5262',
    'E-mail: contato@kadernim.com.br',
    'Endereço: Brasília - DF, Brasil',
  ].join('\n')

  const htmlRaw = await render(
    React.createElement(OtpEmail, { name, otp, expiresIn })
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
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  color: '#e0e7ff',
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

const codeContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const codeBox = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '24px',
  borderRadius: '8px',
  display: 'inline-block',
}

const codeText = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: 0,
  letterSpacing: '4px',
  fontFamily: 'monospace',
}

const expirationMessage = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const warningBox = {
  background: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const warningText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
}

const securityText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '24px 0',
  lineHeight: '1.6',
}

const supportBox = {
  background: '#eef2ff',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const supportTitle = {
  fontSize: '15px',
  color: '#312e81',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const supportText = {
  fontSize: '13px',
  color: '#4338ca',
  margin: '4px 0',
  lineHeight: '1.5',
}

const linkStyle = {
  color: '#667eea',
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
