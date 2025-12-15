import { getUazapiConfig } from './config'

/**
 * Verifica se um número de WhatsApp é válido
 * @param number - Número de WhatsApp no formato internacional (ex: "5511999999999")
 * @returns Promise<boolean> - true se o número for válido, false caso contrário
 */
export async function isWhatsAppNumberValid(number: string): Promise<boolean> {
  const { baseUrl, adminToken } = getUazapiConfig()

  try {
    console.log(`[WhatsApp Check] Verificando número: ${number}`)

    const response = await fetch(`${baseUrl}/chat/check`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: adminToken,
      },
      body: JSON.stringify({
        numbers: [number],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp Check] Erro na resposta da API: ${response.status} ${response.statusText}`, errorText);
      return false;
    }

    const data = await response.json();
    console.log(`[WhatsApp Check] Resposta da API:`, data);

    // A API retorna um array de resultados
    if (Array.isArray(data) && data.length > 0) {
      // Procura o número na resposta
      const numberInfo = data.find(item =>
        item.query === number ||
        item.jid?.startsWith(number.replace(/^55/, ''))
      );

      if (numberInfo) {
        const isValid = numberInfo.isInWhatsapp === true;
        console.log(`[WhatsApp Check] Número ${number} é ${isValid ? 'válido' : 'inválido'}`);
        return isValid;
      }
    }

    console.log(`[WhatsApp Check] Número ${number} não encontrado na resposta`);
    return false;
  } catch (error) {
    console.error('[WhatsApp Check] Erro ao verificar número de WhatsApp:', error);
    return false;
  }
}
