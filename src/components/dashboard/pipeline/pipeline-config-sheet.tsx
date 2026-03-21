'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PipelineStagesManager } from './pipeline-stages-manager'

interface PipelineConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
}

export function PipelineConfigSheet({
  open,
  onOpenChange,
  organizationId,
}: PipelineConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-border border-b pb-4">
          <SheetTitle>Configurar Pipeline</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <PipelineStagesManager organizationId={organizationId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
