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
import { render } from '@react-email/render'
import * as React from 'react'
import { resolveAppName } from './shared/app-name.server'

interface InvitationEmailProps {
  inviteeName?: string
  inviterName: string
  organizationName: string
  acceptUrl: string
  expiresInDays?: number
}

export const InvitationEmail = ({
  inviteeName = 'Usuário',
  inviterName,
  organizationName,
  acceptUrl,
  expiresInDays = 7,
}: InvitationEmailProps) => {
  const appName = resolveAppName()

  return (
    <Html>
      <Head />
      <Preview>{`Defina sua senha e entre em ${organizationName} no ${appName}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>{appName}</Text>
            <Text style={headerSubtitle}>Convite de equipe</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              Olá <strong>{inviteeName}</strong>,
            </Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> convidou você para fazer parte da organização{' '}
              <strong>{organizationName}</strong> no {appName}.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsLine}>
                <strong>Organização:</strong> {organizationName}
              </Text>
              <Text style={detailsLine}>
                <strong>Convidado por:</strong> {inviterName}
              </Text>
              <Text style={detailsLine}>
                <strong>Validade:</strong> {expiresInDays} dias
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={acceptUrl}>
                Aceitar Convite
              </Button>
            </Section>

            <Text style={alternativeLink}>Se preferir, copie e cole este link no navegador:</Text>
            <Link href={acceptUrl} style={linkStyle}>
              {acceptUrl}
            </Link>

            <Hr style={hr} />

            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>Atenção:</strong> Este convite expira em{' '}
                <strong>{expiresInDays} dias</strong>. Se você não esperava este email, pode
                ignorá-lo.
              </Text>
            </Section>

            <Hr style={hr} />

            <Section style={supportBox}>
              <Text style={supportTitle}>Precisa de ajuda?</Text>
              <Text style={supportText}>
                ✉️ E-mail:{' '}
                <Link href="mailto:contato@whatrack.com" style={linkStyle}>
                  contato@whatrack.com
                </Link>
              </Text>
            </Section>

            <Text style={footer}>
              © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
            </Text>
            <Text style={footerSmall}>Este é um email automático. Por favor, não responda.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default InvitationEmail

export async function generateInvitationEmail(props: InvitationEmailProps) {
  const appName = resolveAppName()
  const subject = `Você foi convidado para ${props.organizationName} no ${appName}`

  const text = [
    `Olá ${props.inviteeName || 'Usuário'}!`,
    '',
    `${props.inviterName} convidou você para a organização "${props.organizationName}" no ${appName}.`,
    '',
    `Acesse o link abaixo para aceitar o convite:`,
    props.acceptUrl,
    '',
    `Este convite expira em ${props.expiresInDays ?? 7} dias.`,
    '',
    'Se você não esperava este email, pode ignorá-lo.',
  ].join('\n')

  const html = await render(React.createElement(InvitationEmail, props))

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
  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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
  color: '#e9e7ff',
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
  background: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '20px 0 10px 0',
}

const detailsLine = {
  fontSize: '14px',
  color: '#312e81',
  margin: '4px 0',
  lineHeight: '1.45',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  color: '#ffffff',
  padding: '14px 40px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '16px',
  display: 'inline-block',
}

const alternativeLink = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const linkStyle = {
  color: '#4f46e5',
  fontWeight: 'bold' as const,
  wordBreak: 'break-all' as const,
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
