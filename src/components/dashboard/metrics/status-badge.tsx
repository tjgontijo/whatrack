import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        info: 'bg-info/10 text-info',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

export function StatusBadge({
  className,
  variant,
  size,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

// Helper para mapear status comuns
export const statusVariantMap: Record<string, StatusBadgeProps['variant']> = {
  pending: 'warning',
  active: 'success',
  inactive: 'default',
  completed: 'success',
  cancelled: 'destructive',
  draft: 'default',
  published: 'primary',
  archived: 'default',
  approved: 'success',
  rejected: 'destructive',
  processing: 'info',
}
