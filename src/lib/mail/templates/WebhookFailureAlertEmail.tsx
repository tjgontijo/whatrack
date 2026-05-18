import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { render } from '@react-email/render'
import * as React from 'react'
import { resolveAppName } from './shared/app-name.server'

interface WebhookFailureAlertEmailProps {
  organizationName: string
  webhookId: string
  eventType?: string
  retryCount: number
  lastError: string
  createdAt: string
}

export const WebhookFailureAlertEmail = ({
  organizationName,
  webhookId,
  eventType,
  retryCount,
  lastError,
  createdAt,
}: WebhookFailureAlertEmailProps) => {
  const appName = resolveAppName()

  return (
    <Html>
      <Head />
      <Preview>{`[Alerta] Webhook falhou após ${retryCount} tentativas — ${organizationName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerTitle}>{appName} — Alerta de Webhook</Text>
          </Section>

          <Section style={content}>
            <Section style={alertBox}>
              <Text style={alertText}>
                Um webhook falhou após todas as tentativas de reprocessamento.
              </Text>
            </Section>

            <Text style={label}>Organização:</Text>
            <Text style={value}>{organizationName}</Text>

            <Text style={label}>ID do Webhook:</Text>
            <Text style={value}>{webhookId}</Text>

            {eventType && (
              <>
                <Text style={label}>Tipo de Evento:</Text>
                <Text style={value}>{eventType}</Text>
              </>
            )}

            <Text style={label}>Tentativas realizadas:</Text>
            <Text style={value}>{retryCount}/3</Text>

            <Text style={label}>Criado em:</Text>
            <Text style={value}>{createdAt}</Text>

            <Text style={label}>Último erro:</Text>
            <Text style={errorValue}>{lastError}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              Verifique os logs do sistema para mais detalhes. Este alerta é enviado no máximo uma
              vez por hora por webhook.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WebhookFailureAlertEmail

export async function generateWebhookFailureAlertEmail(props: WebhookFailureAlertEmailProps) {
  const appName = resolveAppName()
  const subject = `[${appName}] Webhook falhou após ${props.retryCount} tentativas — ${props.organizationName}`

  const text = [
    `ALERTA: Falha de Webhook — ${props.organizationName}`,
    '',
    `Um webhook falhou após todas as tentativas de reprocessamento.`,
    '',
    `ID: ${props.webhookId}`,
    props.eventType ? `Tipo: ${props.eventType}` : '',
    `Tentativas: ${props.retryCount}/3`,
    `Criado em: ${props.createdAt}`,
    `Último erro: ${props.lastError}`,
    '',
    'Verifique os logs do sistema para mais detalhes.',
  ]
    .filter(Boolean)
    .join('\n')

  const html = await render(React.createElement(WebhookFailureAlertEmail, props))

  return { subject, text, html }
}

// Styles
const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
}

const header = {
  background: '#dc2626',
  padding: '32px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const headerTitle = {
  color: '#ffffff',
  margin: '0',
  fontSize: '22px',
  fontWeight: 'bold' as const,
}

const content = {
  background: '#ffffff',
  padding: '32px 30px',
  borderRadius: '0 0 8px 8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const alertBox = {
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  padding: '16px',
  margin: '0 0 24px 0',
}

const alertText = {
  fontSize: '15px',
  color: '#991b1b',
  margin: '0',
  fontWeight: 'bold' as const,
}

const label = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '16px 0 4px 0',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold' as const,
  letterSpacing: '0.05em',
}

const value = {
  fontSize: '14px',
  color: '#111827',
  margin: '0',
  fontFamily: 'monospace',
}

const errorValue = {
  fontSize: '13px',
  color: '#dc2626',
  margin: '0',
  fontFamily: 'monospace',
  background: '#fef2f2',
  padding: '8px',
  borderRadius: '4px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.5',
}
