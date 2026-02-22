"use client";

import { useQuery } from "@tanstack/react-query";
const formatDealValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
};

export default function EfficiencyChart({
    startDate,
    endDate,
}: {
    startDate: string;
    endDate: string;
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics", "efficiency", startDate, endDate],
        queryFn: async () => {
            const res = await fetch(
                `/api/v1/analytics/efficiency?startDate=${startDate}&endDate=${endDate}`
            );
            if (!res.ok) throw new Error("Falha ao buscar eficiência");
            return res.json();
        },
    });

    if (isLoading)
        return <div className="bg-card w-full h-full rounded-xl border animate-pulse" />;
    if (error || !data)
        return <div className="bg-card w-full h-full rounded-xl border flex items-center justify-center text-sm text-muted-foreground p-4">Grafico de Eficiência não disponível</div>;

    const agg = data.aggregated?.[0] || {};

    return (
        <div className="flex flex-col bg-card w-full h-full rounded-xl border shadow-sm p-4 overflow-hidden">
            <h3 className="text-base font-semibold mb-4 text-foreground">Esforço por Mensagem</h3>
            <div className="flex flex-col flex-1 bg-background/50 rounded-md p-6 justify-center gap-4">

                <div className="flex flex-col gap-1 text-center bg-card p-4 rounded-xl border">
                    <span className="text-sm font-medium text-muted-foreground">Valor arrecadado por mensagem enviada/recebida:</span>
                    <span className="text-4xl font-black text-emerald-600">
                        R$ {agg.avg_value_per_message?.toFixed(2) ?? "0.00"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1 text-center bg-card p-4 border rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Média de Negócio</span>
                        <span className="text-xl font-bold">R$ {agg.avg_deal_value?.toFixed(2) ?? "0.00"}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-center bg-card p-4 border rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Msg P/ Venda</span>
                        <span className="text-xl font-bold text-foreground">{agg.avg_messages ?? "0"} msgs</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
