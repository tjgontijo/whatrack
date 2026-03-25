'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Settings, 
  Users, 
  FileText, 
  Send 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

const STEPS = [
  { id: 'settings', label: 'Estratégia', icon: Settings },
  { id: 'audience', label: 'Audiência', icon: Users },
  { id: 'content', label: 'Conteúdo', icon: FileText },
  { id: 'confirm', label: 'Revisão', icon: Send },
]

export function CampaignBuilder() {
  const [currentStep, setCurrentStep] = React.useState(0)
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="flex flex-col h-full bg-muted/20 -m-4 md:-m-6">
      {/* Header with Steps */}
      <header className="bg-background border-b px-8 py-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Novo Disparo em Massa</h1>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Passo {currentStep + 1} de {STEPS.length}</p>
        </div>

        <nav className="flex items-center gap-12">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-3 group">
               <div className={cn(
                 "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                 idx === currentStep ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : 
                 idx < currentStep ? "bg-green-500/10 text-green-600 border border-green-500/20" : 
                 "bg-muted text-muted-foreground/60 border border-border"
               )}>
                 {idx < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
               </div>
               <div className="hidden lg:flex flex-col text-left">
                  <span className={cn(
                    "text-xs font-bold leading-tight",
                    idx === currentStep ? "text-primary" : "text-muted-foreground"
                  )}>{step.label}</span>
                  <span className="text-[10px] text-muted-foreground/50 font-medium">Fase {idx + 1}</span>
               </div>
               {idx < STEPS.length - 1 && (
                 <div className="h-px w-8 bg-border ml-10 hidden xl:block" />
               )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" className="h-9 px-4">Cancelar</Button>
           <Button size="sm" className="h-9 px-6 bg-foreground text-background hover:bg-foreground/90 font-bold scale-105 active:scale-100 transition-transform">
             Salvar rascunho
           </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Step content will go here */}
          <div className="bg-background border rounded-2xl shadow-sm min-h-[500px] p-10">
             {currentStep === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="space-y-2">
                      <h2 className="text-3xl font-bold">Defina a estratégia inicial</h2>
                      <p className="text-muted-foreground text-lg">Dê um nome marcante para sua campanha e escolha o propósito deste disparo.</p>
                   </div>
                   
                   {/* Form scaffold */}
                   <div className="grid grid-cols-1 gap-6 pt-6">
                      <div className="space-y-3">
                         <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Nome da Campanha</label>
                         <input 
                           placeholder="Ex: Lançamento Masterclass Abril" 
                           className="w-full text-2xl font-semibold bg-primary/5 border-none focus-visible:ring-0 focus:outline-none p-4 rounded-xl placeholder:opacity-30" 
                         />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 border-2 border-primary bg-primary/5 rounded-2xl relative">
                            <div className="absolute top-4 right-4 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                               <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                            <h4 className="font-bold text-lg mb-1">Marketing</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">Focado em conversão e vendas. Envios em massa para leads e audiências.</p>
                         </div>
                         <div className="p-6 border-2 border-transparent bg-muted/30 rounded-2xl opacity-50 cursor-not-allowed grayscale">
                            <h4 className="font-bold text-lg mb-1 text-muted-foreground">Operacional</h4>
                            <p className="text-sm text-muted-foreground/60 leading-relaxed">Informativos automáticos e transacionais (ex: status de pedido).</p>
                         </div>
                      </div>

                       <div className="space-y-6 pt-8 border-t">
                          <div className="flex items-center justify-between group cursor-pointer p-4 hover:bg-muted/30 rounded-2xl transition-colors">
                             <div className="space-y-1">
                                <h4 className="font-bold text-lg">Vincular Leads ao CRM</h4>
                                <p className="text-sm text-muted-foreground">Ative para que novos contatos virem Leads com a origem desta campanha.</p>
                             </div>
                             <div className="h-7 w-14 bg-primary rounded-full relative flex items-center px-1 shadow-inner">
                                <div className="h-5 w-5 bg-white rounded-full shadow-sm ml-auto" />
                             </div>
                          </div>
                          
                          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex gap-4">
                             <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                <Settings className="h-5 w-5 text-amber-600" />
                             </div>
                             <div className="space-y-1">
                                <h5 className="font-bold text-amber-800 text-sm">Dica de Conversão</h5>
                                <p className="text-xs text-amber-700/80 leading-relaxed">Ao vincular leads, você poderá rastrear o retorno sobre investimento (ROI) desta campanha automaticamente nos dashboards de Analytics.</p>
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
             )}
             {currentStep > 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="bg-muted p-4 rounded-full">
                    {React.createElement(STEPS[currentStep].icon, { className: "h-12 w-12 text-muted-foreground" })}
                  </div>
                  <h2 className="text-2xl font-bold">Página "{STEPS[currentStep].label}" em construção</h2>
                  <p className="text-muted-foreground max-w-sm">Estamos finalizando os detalhes premium deste passo. Próximo release incluirá as seleções dinâmicas.</p>
               </div>
             )}
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="bg-background border-t px-8 py-4 flex items-center justify-center gap-10 sticky bottom-0 z-10">
         <Button 
            variant="ghost" 
            className="flex items-center gap-2 font-bold px-8 h-12"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
         >
           <ChevronLeft className="h-5 w-5" />
           Voltar
         </Button>

         <div className="h-1 w-64 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
         </div>

         <Button 
            className="flex items-center gap-2 font-bold px-10 h-12 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            onClick={() => {
              if (isLastStep) return
              setCurrentStep(currentStep + 1)
            }}
         >
           {isLastStep ? 'Finalizar e Disparar' : 'Próximo passo'}
           {!isLastStep && <ChevronRight className="h-5 w-5" />}
         </Button>
      </footer>
    </div>
  )
}
