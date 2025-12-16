/**
 * Mapa de mensagens de erro de autenticação
 * Traduz códigos de erro do Better Auth para mensagens amigáveis ao usuário
 */

export const authErrorMessages: Record<string, string> = {
  // Sign-up errors
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Este email já está cadastrado. Tente fazer login ou use outro email.',
  INVALID_EMAIL: 'Email inválido. Verifique e tente novamente.',
  WEAK_PASSWORD: 'Senha fraca. Use pelo menos 8 caracteres com letras e números.',
  PASSWORD_MISMATCH: 'As senhas não conferem.',
  MISSING_EMAIL: 'Email é obrigatório.',
  MISSING_PASSWORD: 'Senha é obrigatória.',
  MISSING_NAME: 'Nome é obrigatório.',

  // Sign-in errors
  INVALID_EMAIL_OR_PASSWORD: 'Email ou senha incorretos.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  INVALID_CREDENTIALS: 'Credenciais inválidas.',
  EMAIL_NOT_VERIFIED: 'Email não verificado. Verifique sua caixa de entrada.',
  ACCOUNT_LOCKED: 'Conta bloqueada. Tente novamente mais tarde.',
  TOO_MANY_REQUESTS: 'Muitas tentativas. Tente novamente em alguns minutos.',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  UNKNOWN_ERROR: 'Erro desconhecido. Tente novamente.',
}

/**
 * Retorna mensagem de erro amigável ao usuário
 * Se o código não estiver no mapa, retorna a mensagem original ou uma mensagem genérica
 */
export function getAuthErrorMessage(code?: string, fallback?: string): string {
  if (!code) {
    return fallback || authErrorMessages.UNKNOWN_ERROR
  }

  return authErrorMessages[code] || fallback || code
}
