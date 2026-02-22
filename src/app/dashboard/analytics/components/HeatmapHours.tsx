"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveHeatMapCanvas } from "@nivo/heatmap";

export default function HeatmapHours({
    startDate,
    endDate,
}: {
    startDate: string;
    endDate: string;
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics", "heatmap", startDate, endDate],
        queryFn: async () => {
            const res = await fetch(
                `/api/v1/analytics/heatmap?startDate=${startDate}&endDate=${endDate}`
            );
            if (!res.ok) throw new Error("Falha ao buscar heatmap");
            return res.json();
        },
    });

    if (isLoading)
        return <div className="bg-card w-full h-full rounded-xl border animate-pulse" />;
    if (error || !data)
        return <div className="bg-card w-full h-full rounded-xl border flex items-center justify-center text-sm text-muted-foreground p-4">Heatmap não disponível</div>;

    // Process data for Nivo Heatmap
    // Needs format: [{ id: "Monday", data: [{ x: "8h", y: 15 }, ...] }, ...]
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);

    const matrix = daysOfWeek.map((day) => {
        return {
            id: day,
            data: hours.map((h) => ({ x: h, y: 0 })),
        };
    });

    data.forEach((row: any) => {
        const dayName = daysOfWeek[row.day_of_week];
        const hourLabel = `${row.hour}h`;
        const dayItem = matrix.find((d) => d.id === dayName);
        if (dayItem) {
            const hourItem = dayItem.data.find((d) => d.x === hourLabel);
            if (hourItem) hourItem.y = row.message_count;
        }
    });

    return (
        <div className="flex flex-col bg-card w-full h-full rounded-xl border shadow-sm p-4 overflow-hidden">
            <h3 className="text-base font-semibold mb-4 text-foreground">Horários de Pico (Mensagens Recebidas)</h3>
            <div className="flex-1 min-h-0 bg-background/50 rounded-md">
                <ResponsiveHeatMapCanvas
                    data={matrix}
                    margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                    valueFormat=">-.2s"
                    axisTop={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: "",
                        legendOffset: 46,
                    }}
                    axisBottom={null}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: "",
                        legendPosition: "middle",
                        legendOffset: -72,
                    }}
                    colors={{
                        type: "sequential",
                        scheme: "blues",
                    }}
                    emptyColor="#f1f5f9"
                    borderWidth={1}
                    borderColor="#ffffff"
                />
            </div>
        </div>
    );
}
