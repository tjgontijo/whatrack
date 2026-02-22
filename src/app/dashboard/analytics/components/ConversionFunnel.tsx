"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveFunnel } from "@nivo/funnel";

export default function ConversionFunnel({
    startDate,
    endDate,
}: {
    startDate: string;
    endDate: string;
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics", "conversion", startDate, endDate],
        queryFn: async () => {
            const res = await fetch(
                `/api/v1/analytics/conversion?startDate=${startDate}&endDate=${endDate}`
            );
            if (!res.ok) throw new Error("Falha ao buscar funil");
            return res.json();
        },
    });

    if (isLoading)
        return <div className="bg-card w-full h-full rounded-xl border animate-pulse" />;
    if (error || !data)
        return <div className="bg-card w-full h-full rounded-xl border flex items-center justify-center text-sm text-muted-foreground p-4">Funil não disponível</div>;

    const funnelData = data.stageOverview.map((stage: any) => ({
        id: stage.stage_name,
        value: stage.ticket_count,
        label: stage.stage_name,
    }));

    return (
        <div className="flex flex-col bg-card w-full h-full rounded-xl border shadow-sm p-4 overflow-hidden">
            <h3 className="text-base font-semibold mb-4 text-foreground">Funil de Vendas</h3>
            <div className="flex-1 min-h-0 bg-background/50 rounded-md">
                <ResponsiveFunnel
                    data={funnelData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    valueFormat=">-.0f"
                    colors={{ scheme: "nivo" }}
                    borderWidth={20}
                    labelColor={{
                        from: "color",
                        modifiers: [["darker", 3]],
                    }}
                    beforeSeparatorLength={100}
                    beforeSeparatorOffset={20}
                    afterSeparatorLength={100}
                    afterSeparatorOffset={20}
                    currentPartSizeExtension={10}
                    currentBorderWidth={40}
                    motionConfig="wobbly"
                />
            </div>
        </div>
    );
}
