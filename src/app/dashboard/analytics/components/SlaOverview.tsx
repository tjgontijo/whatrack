"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveBar } from "@nivo/bar";

export default function SlaOverview({
    startDate,
    endDate,
}: {
    startDate: string;
    endDate: string;
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics", "sla", startDate, endDate],
        queryFn: async () => {
            const res = await fetch(
                `/api/v1/analytics/sla?startDate=${startDate}&endDate=${endDate}`
            );
            if (!res.ok) throw new Error("Falha ao buscar SLA");
            return res.json();
        },
    });

    if (isLoading)
        return <div className="bg-card w-full h-full rounded-xl border animate-pulse" />;
    if (error || !data)
        return <div className="bg-card w-full h-full rounded-xl border flex items-center justify-center text-sm text-muted-foreground p-4">Visão de SLA não disponível</div>;

    const barData = data.distribution.map((d: any) => ({
        bucket: d.bucket,
        Tíquetes: d.count,
    }));

    return (
        <div className="flex flex-col bg-card w-full h-full rounded-xl border shadow-sm p-4 overflow-hidden">
            <h3 className="text-base font-semibold mb-4 text-foreground">Tempo da 1ª Resposta (SLA)</h3>
            <div className="flex-1 min-h-0 bg-background/50 rounded-md">
                <ResponsiveBar
                    data={barData}
                    keys={["Tíquetes"]}
                    indexBy="bucket"
                    margin={{ top: 10, right: 10, bottom: 40, left: 50 }}
                    padding={0.3}
                    valueScale={{ type: "linear" }}
                    indexScale={{ type: "band", round: true }}
                    colors={{ scheme: "paired" }}
                    defs={[]}
                    fill={[]}
                    borderColor={{
                        from: "color",
                        modifiers: [["darker", 1.6]],
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -15,
                        legend: "Tempo",
                        legendPosition: "middle",
                        legendOffset: 32,
                        truncateTickAt: 0,
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: "Volume",
                        legendPosition: "middle",
                        legendOffset: -40,
                        truncateTickAt: 0,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{
                        from: "color",
                        modifiers: [["darker", 1.6]],
                    }}
                    role="application"
                />
            </div>
        </div>
    );
}
