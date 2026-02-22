"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function LeadActivity() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics", "lead-activity"],
        queryFn: async () => {
            const res = await fetch(`/api/v1/analytics/lead-activity`);
            if (!res.ok) throw new Error("Falha ao buscar atividades");
            return res.json();
        },
    });

    if (isLoading)
        return <div className="bg-card w-full h-32 rounded-xl border animate-pulse" />;
    if (error || !data)
        return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Waiting Leads */}
            <div className="flex flex-col bg-card w-full rounded-xl border shadow-sm p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Leads Aguardando Resposta</h3>
                    <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">{data.waitingLeads?.length || 0} Tickets</Badge>
                </div>
                <div className="flex-1 min-h-0 bg-background/50 rounded-md p-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {data.waitingLeads?.map((lead: any) => (
                        <div key={lead.id} className="flex justify-between items-center p-3 text-sm bg-card border rounded-lg">
                            <div className="flex flex-col">
                                <span className="font-semibold">{lead.push_name || lead.name || "Sem Nome"}</span>
                                <span className="text-muted-foreground text-xs">{lead.phone || "-"}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="font-bold">{Math.floor(lead.seconds_waiting / 60)} min</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground bg-secondary px-1 py-0.5 rounded mt-1">{lead.stage_name}</span>
                            </div>
                        </div>
                    ))}
                    {data.waitingLeads?.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground p-6">Nenhum lead esperando :)</p>
                    )}
                </div>
            </div>

            {/* Forgotten Leads */}
            <div className="flex flex-col bg-card w-full rounded-xl border shadow-sm p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Leads Esquecidos (+24h)</h3>
                    <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">{data.forgottenLeads?.length || 0} Abandonados</Badge>
                </div>
                <div className="flex-1 min-h-0 bg-background/50 rounded-md p-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {data.forgottenLeads?.map((lead: any) => (
                        <div key={lead.id} className="flex justify-between items-center p-3 text-sm bg-card border border-red-100 rounded-lg">
                            <div className="flex flex-col">
                                <span className="font-semibold">{lead.name || "Sem Nome"}</span>
                                <span className="text-muted-foreground text-xs">{lead.phone || "-"}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="font-bold text-red-600">{lead.hours_since_outbound} horas</span>
                                <span className="text-[10px] text-muted-foreground bg-secondary px-1 py-0.5 rounded mt-1">Esquecido</span>
                            </div>
                        </div>
                    ))}
                    {data.forgottenLeads?.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground p-6">Nenhum lead esquecido! Ótimo trabalho.</p>
                    )}
                </div>
            </div>

        </div>
    );
}
