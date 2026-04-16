import React from 'react'

interface BillingAutoUpgradeEmailProps {
  organizationName: string
  userEmail: string
  oldPlanName: string
  newPlanName: string
  upgradeDate: string
  nextChargeDate: string
  nextChargeAmount: string
}

export const BillingAutoUpgradeEmail: React.FC<BillingAutoUpgradeEmailProps> = ({
  organizationName,
  userEmail,
  oldPlanName,
  newPlanName,
  upgradeDate,
  nextChargeDate,
  nextChargeAmount,
}) => {
  const appName = 'Whatrack'

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>
          Seu plano foi atualizado
        </h1>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          Detectamos que seu plano {oldPlanName} foi atualizado para {newPlanName}
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
            ORGANIZAÇÃO
          </p>
          <p style={{ margin: '0', color: '#000', fontSize: '16px', fontWeight: '600' }}>{organizationName}</p>
        </div>

        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
                PLANO ANTERIOR
              </p>
              <p style={{ margin: '0', color: '#000', fontSize: '16px', fontWeight: '600' }}>{oldPlanName}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
                NOVO PLANO
              </p>
              <p style={{ margin: '0', color: '#000', fontSize: '16px', fontWeight: '600' }}>{newPlanName}</p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
                DATA DE MUDANÇA
              </p>
              <p style={{ margin: '0', color: '#000', fontSize: '16px', fontWeight: '600' }}>{upgradeDate}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
                PRÓXIMA COBRANÇA
              </p>
              <p style={{ margin: '0', color: '#000', fontSize: '16px', fontWeight: '600' }}>{nextChargeDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
        <p style={{ margin: '0', color: '#0369a1', fontSize: '14px', fontWeight: '600' }}>
          Valor da próxima cobrança: <strong>{nextChargeAmount}</strong>
        </p>
        <p
          style={{
            margin: '8px 0 0 0',
            color: '#0c5a6e',
            fontSize: '12px',
          }}
        >
          Este valor foi calculado de forma proporcional aos dias restantes do seu ciclo atual.
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <p style={{ margin: '0 0 12px 0', color: '#000', fontSize: '14px', fontWeight: '600' }}>
          O que muda?
        </p>
        <ul
          style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          <li>Seu novo plano está ativo imediatamente</li>
          <li>Você terá acesso a todos os recursos inclusos</li>
          <li>Próximo ciclo de cobrança segue normalmente</li>
          <li>Você pode gerenciar seu plano a qualquer momento</li>
        </ul>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <p style={{ margin: '0 0 12px 0', color: '#000', fontSize: '14px' }}>
          Dúvidas? Responda este email ou acesse seu dashboard para mais detalhes.
        </p>
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e5e5',
          paddingTop: '20px',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>© {new Date().getFullYear()} {appName}. Todos os direitos reservados.</p>
        <p style={{ margin: '0' }}>Você recebeu este email porque é administrador desta organização.</p>
      </div>
    </div>
  )
}
