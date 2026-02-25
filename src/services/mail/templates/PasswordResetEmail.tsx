import {
  Body,
  Button,
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

import { resolveAppName } from './shared/app-name.server'

interface PasswordResetEmailProps {
  name?: string
  resetLink: string
  expiresIn?: number
}

export function PasswordResetEmail({
  name = 'Usuário',
  resetLink,
  expiresIn = 60,
}: PasswordResetEmailProps) {
  const appName = resolveAppName()

  return (
    <Html>
      <Head />
      <Preview>{`Você solicitou redefinição de senha no ${appName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={title}>Redefinir senha</Text>
            <Text style={paragraph}>
              Olá <strong>{name}</strong>,
            </Text>
            <Text style={paragraph}>
              Recebemos uma solicitação para redefinir a senha da sua conta no {appName}. Clique no
              botão abaixo para continuar.
            </Text>
            <Section style={buttonWrap}>
              <Button href={resetLink} style={button}>
                Redefinir senha
              </Button>
            </Section>
            <Text style={muted}>
              Este link expira em <strong>{expiresIn} minutos</strong>.
            </Text>
            <Text style={muted}>Se você não solicitou a redefinição, pode ignorar este e-mail.</Text>
            <Hr style={hr} />
            <Text style={small}>Ou copie e cole o link no navegador:</Text>
            <Link href={resetLink} style={link}>
              {resetLink}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export async function generatePasswordResetEmail({
  name = 'Usuário',
  resetLink,
  expiresIn = 60,
}: PasswordResetEmailProps) {
  const appName = resolveAppName()
  const subject = `🔐 Redefina sua senha - ${appName}`
  const text = [
    `Olá ${name},`,
    '',
    `Para redefinir sua senha, acesse: ${resetLink}`,
    '',
    `Este link expira em ${expiresIn} minutos.`,
    '',
    'Se você não solicitou, ignore este e-mail.',
  ].join('\n')

  const htmlRaw = await render(
    React.createElement(PasswordResetEmail, {
      name,
      resetLink,
      expiresIn,
    })
  )
  const html = await pretty(htmlRaw)

  return { subject, text, html }
}

const main = {
  backgroundColor: '#f6f7fb',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '24px 0',
}

const content = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '28px',
}

const title = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px 0',
}

const paragraph = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 14px 0',
}

const buttonWrap = {
  textAlign: 'center' as const,
  margin: '26px 0',
}

const button = {
  backgroundColor: '#111827',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 26px',
  textDecoration: 'none',
}

const muted = {
  color: '#4b5563',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const small = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px 0',
}

const link = {
  color: '#2563eb',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
}
