import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
}

/**
 * Visual indicator for WebSocket connection status
 */
export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  return (
    <div
      className="flex items-center gap-2"
      data-testid="connection-status"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )}
        data-testid="connection-indicator"
      />
      <span className="text-xs text-muted-foreground">
        {isConnected ? "Conectado" : "Desconectado"}
      </span>
      {!isConnected && error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
