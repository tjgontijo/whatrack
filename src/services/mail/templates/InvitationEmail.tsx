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
  const appName = process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'WhaTrack'

  return (
    <Html>
      <Head />
      <Preview>
        Você foi convidado para {organizationName} no {appName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>{appName}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              Olá <strong>{inviteeName}</strong>,
            </Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> convidou você para fazer parte da organização{' '}
              <strong>{organizationName}</strong> no {appName}.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={acceptUrl}>
                Aceitar Convite
              </Button>
            </Section>

            <Text style={alternativeLink}>Ou copie e cole este link no seu navegador:</Text>
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
  const appName = process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'WhaTrack'
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
  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
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
  color: '#128C7E',
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
