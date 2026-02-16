'use client'

import { useEffect, useState } from 'react';

interface HistorySyncStatus {
  status: string | null;
  progress: number;
  error: string | null;
}

/**
 * Hook para rastrear status de sincronização de histórico
 *
 * Monitora:
 * - historySyncStatus: 'pending_consent' | 'pending_history' | 'syncing' | 'completed' | 'failed'
 * - historySyncProgress: 0-100
 * - historySyncError: mensagem de erro se houver
 */
export function useHistorySyncStatus(configId?: string): HistorySyncStatus {
  const [status, setStatus] = useState<HistorySyncStatus>({
    status: null,
    progress: 0,
    error: null,
  });

  useEffect(() => {
    if (!configId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/v1/whatsapp/config/${configId}`);
        if (!response.ok) return;

        const data = await response.json();
        setStatus({
          status: data.historySyncStatus,
          progress: data.historySyncProgress || 0,
          error: data.historySyncError || null,
        });
      } catch (error) {
        console.error('[useHistorySyncStatus] Error fetching status:', error);
      }
    };

    // Verificar imediatamente
    checkStatus();

    // Pooling a cada 10 segundos durante sincronização
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, [configId]);

  return status;
}
